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
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="site-header__inner">
              <Link className="brand" href={current ? "/dashboard" : "/"}>
                <span className="brand__mark">A</span>
                <span>Auth Assignment</span>
              </Link>
              <nav className="nav" aria-label="Main navigation">
                {current ? (
                  <>
                    <Link href="/dashboard">Dashboard</Link>
                    <Link href="/security">Security</Link>
                    <Link href="/sessions">Sessions</Link>
                    {current.user.role === "admin" ? (
                      <>
                        <Link href="/admin/users">Users</Link>
                        <Link href="/admin/audit">Audit</Link>
                      </>
                    ) : null}
                    <form action={logoutAction}>
                      <button className="ghost-button" type="submit">
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login">Sign in</Link>
                    <Link href="/signup">Sign up</Link>
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
