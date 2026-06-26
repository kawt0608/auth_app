import { logoutOtherSessionsAction } from "@/app/actions/auth";
import { SecuritySettingsForm } from "@/components/SecuritySettingsForm";
import { getSecurityEventsForCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function SecurityPage() {
  const { current, events } = await getSecurityEventsForCurrentUser();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Security</p>
        <h1>Account security</h1>
        <p className="lead">
          Change your password, sign out other devices, and review recent
          security events for {current.user.email}.
        </p>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <h2>Change password</h2>
          <p>
            The current password is required. A successful change revokes other
            active sessions.
          </p>
          <SecuritySettingsForm />
        </article>

        <article className="panel">
          <h2>Session safety</h2>
          <p>
            Keep this browser signed in, but revoke every other active session
            for your account.
          </p>
          <form action={logoutOtherSessionsAction}>
            <button className="danger-button" type="submit">
              Sign out other sessions
            </button>
          </form>
        </article>
      </section>

      <section className="panel">
        <h2>Recent security events</h2>
        {events.length === 0 ? (
          <div className="empty">No security events have been recorded yet.</div>
        ) : (
          <div className="event-list">
            {events.map((event) => (
              <article className="event-row" key={event.id}>
                <div>
                  <span className="badge">{event.type}</span>
                  <h3>{event.summary}</h3>
                  <p>
                    {formatDateTime(event.createdAt)}
                    {event.ipAddress ? ` | IP: ${event.ipAddress}` : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
