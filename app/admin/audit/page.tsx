import { getSecurityEventsForAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function AdminAuditPage() {
  const { events } = await getSecurityEventsForAdmin();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Admin</p>
        <h1>Security audit log</h1>
        <p className="lead">
          Admin-only view of recent authentication, session, password, and
          account-management events.
        </p>
      </section>

      <section className="table-wrap" aria-label="Security audit log">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Summary</th>
              <th>User ID</th>
              <th>Actor ID</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td data-label="Time">{formatDateTime(event.createdAt)}</td>
                <td data-label="Type">
                  <span className="badge">{event.type}</span>
                </td>
                <td data-label="Summary">{event.summary}</td>
                <td data-label="User ID">{event.userId ?? "-"}</td>
                <td data-label="Actor ID">{event.actorUserId ?? "-"}</td>
                <td data-label="IP">{event.ipAddress ?? "-"}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} data-label="Events">
                  No events have been recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
