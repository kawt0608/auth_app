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
          <p className="eyebrow">Next.js / TypeScript security assignment</p>
          <h1>Secure session-based authentication with Prisma</h1>
          <p className="lead">
            This app demonstrates password strength checks, account lockout,
            Remember me sessions, session revocation, password change,
            audit logs, admin authorization, CSRF checks, and security headers.
          </p>
          <div className="toolbar">
            <Link className="primary-button" href="/signup">
              Create account
            </Link>
            <Link className="button-link" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
