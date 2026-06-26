import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const { user, session } = await requireUser();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Dashboard</p>
        <h1>{user.name} dashboard</h1>
        <p className="lead">
          This page is protected by server-side session validation.
        </p>
      </section>

      <section className="summary-grid" aria-label="Login state">
        <article className="summary-card">
          <h2>Role</h2>
          <strong>{user.role === "admin" ? "Admin" : "User"}</strong>
          <p>Admin screens also verify the role on the server.</p>
        </article>
        <article className="summary-card">
          <h2>Session expires</h2>
          <strong>{formatDateTime(session.expiresAt)}</strong>
          <p>{session.rememberMe ? "Remember me enabled" : "Regular session"}</p>
        </article>
        <article className="summary-card">
          <h2>Last used</h2>
          <strong>{formatDateTime(session.lastUsedAt)}</strong>
          <p>The timestamp is updated during server-side session checks.</p>
        </article>
      </section>

      <section className="toolbar">
        <Link className="primary-button" href="/security">
          Open security settings
        </Link>
        <Link className="button-link" href="/sessions">
          Manage sessions
        </Link>
        {user.role === "admin" ? (
          <Link className="button-link" href="/admin/users">
            Manage users
          </Link>
        ) : null}
      </section>
    </main>
  );
}
