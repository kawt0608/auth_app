import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { logoutAction } from "./actions/auth";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Auth Assignment App",
  description: "Next.js authentication and authorization assignment app"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const current = await getCurrentSession();

  return (
    <html lang="ja">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="site-header__inner">
              <Link className="brand" href={current ? "/dashboard" : "/"}>
                <span className="brand__mark">A</span>
                <span>Auth Assignment</span>
              </Link>
              <nav className="nav" aria-label="メインナビゲーション">
                {current ? (
                  <>
                    <Link href="/dashboard">ダッシュボード</Link>
                    <Link href="/sessions">セッション</Link>
                    {current.user.role === "admin" ? (
                      <Link href="/admin/users">ユーザー管理</Link>
                    ) : null}
                    <form action={logoutAction}>
                      <button className="ghost-button" type="submit">
                        ログアウト
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login">ログイン</Link>
                    <Link href="/signup">サインアップ</Link>
                  </>
                )}
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
