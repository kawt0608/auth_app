import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

export default async function HomePage() {
  const current = await getCurrentSession();

  if (current) {
    redirect("/dashboard");
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero__body">
          <p className="eyebrow">Next.js / TypeScript 認証課題</p>
          <h1>セッションベース認証を安全に確認できるWebアプリ</h1>
          <p className="lead">
            パスワード強度表示、表示切り替え、ログイン試行制限、
            Remember me、アクティブセッション管理、管理者向けユーザー管理を実装しています。
          </p>
          <div className="toolbar">
            <Link className="primary-button" href="/signup">
              サインアップ
            </Link>
            <Link className="button-link" href="/login">
              ログイン
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
