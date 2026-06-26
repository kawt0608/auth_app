import { revokeSessionAction } from "@/app/actions/auth";
import { getActiveSessionsForCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function SessionsPage() {
  const { sessions } = await getActiveSessionsForCurrentUser();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Sessions</p>
        <h1>Active sessions</h1>
        <p className="lead">
          Review every active session for your account and revoke any session
          you no longer trust.
        </p>
      </section>

      {sessions.length === 0 ? (
        <div className="empty">No active sessions were found.</div>
      ) : (
        <section className="session-list" aria-label="Session list">
          {sessions.map((session) => (
            <article className="session-row" key={session.id}>
              <div>
                <h2>
                  {session.userAgent}
                  {session.isCurrent ? (
                    <span className="badge" data-tone="success">
                      Current session
                    </span>
                  ) : null}
                </h2>
                <div className="meta-grid">
                  <span>Created: {formatDateTime(session.createdAt)}</span>
                  <span>Last used: {formatDateTime(session.lastUsedAt)}</span>
                  <span>Expires: {formatDateTime(session.expiresAt)}</span>
                  <span>IP: {session.ipAddress}</span>
                  <span>
                    Type: {session.rememberMe ? "Remember me" : "Regular"}
                  </span>
                </div>
              </div>
              <form action={revokeSessionAction}>
                <input name="sessionId" type="hidden" value={session.id} />
                <button className="danger-button" type="submit">
                  Revoke
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
