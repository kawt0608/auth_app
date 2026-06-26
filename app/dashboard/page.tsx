import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const { user, session } = await requireUser();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Dashboard</p>
        <h1>{user.name} さんのダッシュボード</h1>
        <p className="lead">
          認証済みユーザーだけが見られるページです。セッション状態とロールを確認できます。
        </p>
      </section>

      <section className="summary-grid" aria-label="ログイン状態">
        <article className="summary-card">
          <h2>ロール</h2>
          <strong>{user.role === "admin" ? "管理者" : "一般ユーザー"}</strong>
          <p>管理者機能はサーバー側でもロール確認します。</p>
        </article>
        <article className="summary-card">
          <h2>セッション期限</h2>
          <strong>{formatDateTime(session.expiresAt)}</strong>
          <p>{session.rememberMe ? "Remember me 有効" : "通常セッション"}</p>
        </article>
        <article className="summary-card">
          <h2>最終利用</h2>
          <strong>{formatDateTime(session.lastUsedAt)}</strong>
          <p>ページ表示時にサーバー側で更新されます。</p>
        </article>
      </section>

      <section className="toolbar">
        <Link className="primary-button" href="/sessions">
          セッション一覧を開く
        </Link>
        {user.role === "admin" ? (
          <Link className="button-link" href="/admin/users">
            ユーザー管理を開く
          </Link>
        ) : null}
      </section>
    </main>
  );
}
