# Auth Assignment App

Next.js / TypeScript で実装した、認証・認可機能付きの Web セキュリティアプリです。

セッションベース認証を採用し、Prisma ORM でユーザー、セッション、ログイン試行、監査イベントを管理します。ローカルでは SQLite、Vercel では PostgreSQL を使って動作する構成です。

## アプリ概要

このアプリでは、ユーザーがサインアップ、ログイン、ログアウトを行えます。ログイン後はダッシュボード、セキュリティ設定、アクティブセッション一覧を確認できます。

管理者ユーザーは、一般ユーザーには表示されないユーザー管理画面と監査ログ画面にアクセスできます。管理者機能は画面表示だけでなく、サーバー側の処理でも必ずロール確認を行います。

## 使用技術

- Next.js 15 App Router
- TypeScript
- React 19
- Prisma ORM
- SQLite: ローカル確認用
- PostgreSQL: Vercel デプロイ用
- bcryptjs
- zod
- ESLint
- TypeScript typecheck
- Node.js test runner

## ローカル起動方法

ローカルだけで確認する場合は、次の手順で起動できます。

```bash
npm install
copy .env.example .env
npm run local:setup
npm run build
npm run start
```

起動後、ブラウザで次を開きます。

```text
http://localhost:3000
```

`npm run local:setup` はローカル SQLite DB を初期化し、確認用アカウントを作り直します。

## Vercel デプロイ方法

Vercel では SQLite ファイルを永続化できないため、PostgreSQL を使用します。Vercel Marketplace の Prisma Postgres、Neon、Supabase などで PostgreSQL を作成し、Vercel の Environment Variables に次を設定してください。

```text
DATABASE_URL=postgresql://...
```

このリポジトリには `vercel.json` を追加しており、Vercel の Build Command は自動的に次になります。

```bash
npm run vercel-build
```

`npm run vercel-build` は以下を実行します。

```bash
prisma generate && prisma migrate deploy && next build
```

そのため、Vercel デプロイ時に Prisma Client 生成、DB migration 適用、Next.js build まで実行されます。

デプロイ後に確認用アカウントを作りたい場合は、Vercel の本番 `DATABASE_URL` を設定した信頼できる端末で次を一度だけ実行してください。

```bash
npm run seed
```

`npm run seed` はデモアカウントを upsert します。ローカル用の `npm run local:setup` と違い、DB 全体をリセットしません。

## テスト用アカウント

`npm run local:setup` 実行後、以下のアカウントでログインできます。

```text
一般ユーザー:
email: user@example.com
password: Password123!

管理者:
email: admin@example.com
password: AdminPassword123!
```


## 認証方式

セッションベース認証を採用しています。

- ログイン成功時にランダムなセッショントークンを生成します。
- Cookie には生のセッショントークンを保存します。
- DB にはセッショントークンの SHA-256 ハッシュのみ保存します。
- パスワードは bcrypt でハッシュ化して保存します。
- Cookie は `HttpOnly`、`SameSite=Lax`、`path=/`、明示的な有効期限を設定します。
- Vercel 上では Cookie に `Secure` が付きます。
- 通常セッションの有効期限は 2 時間です。
- Remember me 有効時のセッション有効期限は 30 日です。

## 実装した認証・認可機能

### 1. パスワード強度表示

サインアップ画面で、入力中のパスワード強度をリアルタイムに表示します。

評価項目:

- 10文字以上
- 大文字
- 小文字
- 数字
- 記号

同じルールをサーバー側でも検証し、弱いパスワードではアカウントを作成できません。

確認方法:

1. `/signup` を開きます。
2. `abc` など弱いパスワードを入力します。
3. 不足している条件が表示されることを確認します。
4. `Password123!` を入力します。
5. すべての条件が OK になり、強度が `Strong` になることを確認します。

![パスワード強度表示](./public/screenshots/signup-security.png)

### 2. パスワード表示・非表示切り替え

ログイン、サインアップ、パスワード変更フォームに `Show` / `Hide` ボタンを追加しています。

確認方法:

1. `/login`、`/signup`、または `/security` を開きます。
2. パスワードを入力します。
3. `Show` をクリックします。
4. 入力欄の `type` が `password` から `text` に切り替わり、値が表示されることを確認します。
5. `Hide` をクリックし、再び非表示になることを確認します。

### 3. サインアップ時のパスワード確認

サインアップ時に確認用パスワードを入力させ、サーバー側で一致確認を行います。

確認方法:

1. `/signup` を開きます。
2. `Password` と `Confirm password` に異なる値を入力します。
3. 送信します。
4. `Passwords do not match.` が表示され、アカウントが作成されないことを確認します。

### 4. ログイン試行回数制限・ロックアウト

短時間にログイン失敗が続いた場合、一定時間ログインを制限します。

ルール:

- メールアドレス単位と IP アドレス単位で失敗回数を記録します。
- 10分以内に 5 回失敗するとロックします。
- ロック時間は 5 分です。
- ロック中は残り時間の目安を含むエラーメッセージを表示します。
- 管理者はユーザー管理画面からロック解除できます。

確認方法:

1. `/login` を開きます。
2. `user@example.com` に対して間違ったパスワードを複数回入力します。
3. ロックアウトメッセージが表示されることを確認します。
4. 管理者でログインし、`/admin/users` から `Clear lock` を実行できることを確認します。

![ログインロックアウト](./public/screenshots/login-lockout.png)

### 5. Remember me

ログイン画面に `Keep me signed in` チェックボックスを追加しています。

- チェックなし: 2時間セッション
- チェックあり: 30日セッション

確認方法:

1. `/login` を開きます。
2. `Keep me signed in` にチェックを入れます。
3. ログインします。
4. `/dashboard` を開きます。
5. セッション種別が Remember me になり、有効期限が通常より長いことを確認します。

![Remember me](./public/screenshots/dashboard-remember-me.png)

### 6. アクティブセッション一覧・個別ログアウト

`/sessions` で、ログイン中ユーザー自身のアクティブセッションだけを一覧表示します。

表示項目:

- User-Agent
- IP アドレス
- 作成日時
- 最終利用日時
- 有効期限
- Remember me 状態
- 現在のセッションかどうか

各セッションは個別に無効化できます。現在のセッションを無効化した場合は、そのブラウザもログアウトされます。

確認方法:

1. ログインします。
2. `/sessions` を開きます。
3. 現在のセッションが表示されることを確認します。
4. `Revoke` をクリックします。
5. セッションが無効化されることを確認します。

![アクティブセッション](./public/screenshots/sessions.png)

### 7. 現在のパスワード確認付きパスワード変更

`/security` でログイン中ユーザーがパスワードを変更できます。

ルール:

- 現在のパスワード入力が必須です。
- 新しいパスワードは強度ルールを満たす必要があります。
- 現在のパスワードと同じ値は拒否します。
- 変更成功後、現在のセッション以外を無効化します。
- 監査イベントを記録します。

確認方法:

1. ログインします。
2. `/security` を開きます。
3. 間違った現在のパスワードを入力し、拒否されることを確認します。
4. 正しい現在のパスワードと強い新パスワードを入力します。
5. 成功メッセージと監査イベントが表示されることを確認します。

![セキュリティ設定](./public/screenshots/security-settings.png)

### 8. 他セッション一括ログアウト

`/security` に、現在のブラウザ以外のセッションを一括で無効化するボタンを実装しています。

確認方法:

1. 複数ブラウザまたは複数セッションでログインします。
2. `/security` を開きます。
3. `Sign out other sessions` をクリックします。
4. `/sessions` で現在のセッションだけが残っていることを確認します。

### 9. セキュリティイベント履歴

認証・認可に関するイベントを DB に記録します。

記録する主なイベント:

- サインアップ
- ログイン成功
- ログイン失敗
- ログアウト
- セッション無効化
- パスワード変更
- 管理者によるアカウント操作
- Origin 不一致によるブロック

一般ユーザーは `/security` で自分に関係するイベントだけを確認できます。

![セキュリティイベント履歴](./public/screenshots/security-settings.png)

### 10. 管理者限定ユーザー管理

管理者のみ `/admin/users` にアクセスできます。

管理者ができること:

- ユーザー一覧表示
- アカウント停止
- アカウント有効化
- ログインロック解除
- 停止ユーザーのアクティブセッション無効化

一般ユーザーは画面にも API にもアクセスできないよう、サーバー側で `role` を確認しています。

![管理者ユーザー管理](./public/screenshots/admin-users.png)

### 11. 管理者限定監査ログ

管理者のみ `/admin/audit` で全ユーザーのセキュリティイベントを確認できます。

確認方法:

1. `admin@example.com` でログインします。
2. `/admin/audit` を開きます。
3. ログイン、パスワード変更、セッション操作、管理者操作のイベントが表示されることを確認します。

![管理者監査ログ](./public/screenshots/admin-audit.png)

### 12. CSRF 対策としての Origin チェック

状態を変更する Server Action では、リクエストの `Origin` と現在の `Host` が一致するか確認します。

対象操作:

- ログイン
- サインアップ
- ログアウト
- セッション無効化
- パスワード変更
- 他セッション一括ログアウト
- 管理者による停止、有効化、ロック解除

Origin が一致しないリクエストは拒否し、監査イベントとして記録します。

### 13. セキュリティヘッダー

`next.config.ts` でセキュリティ関連ヘッダーを設定しています。

設定している主なヘッダー:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`
- `Strict-Transport-Security`

確認コマンド:

```bash
Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing | Select-Object -ExpandProperty Headers
```

## セキュリティ上の工夫

- パスワードは平文保存せず、bcrypt でハッシュ化しています。
- セッショントークンは DB に平文保存せず、SHA-256 ハッシュのみ保存しています。
- 認証・認可は Server Component / Server Action 側で検証しています。
- 管理者機能はサーバー側で `role` を確認しています。
- 入力値は zod でサーバー側検証しています。
- Cookie は `HttpOnly`、`SameSite=Lax`、`Secure`、有効期限を設定しています。
- ログイン失敗回数をメールアドレスと IP アドレスの両方で記録しています。
- アカウント停止時は対象ユーザーのアクティブセッションを無効化します。
- パスワード変更時は他セッションを無効化します。
- 内部エラーや秘密情報を画面に表示しないようにしています。
- 不要な教材由来の別認証方式やショップ、ニュース系サンプルコードは含めていません。

## 主なルート

- `/` ホーム
- `/signup` サインアップ
- `/login` ログイン
- `/dashboard` ログイン後ダッシュボード
- `/security` セキュリティ設定、イベント履歴
- `/sessions` アクティブセッション管理
- `/admin/users` 管理者ユーザー管理
- `/admin/audit` 管理者監査ログ

## 確認コマンド

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

実施済み確認:

- `npm run local:setup`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit --omit=dev`
