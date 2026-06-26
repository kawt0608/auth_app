import {
  activateUserAction,
  suspendUserAction,
  unlockUserAction
} from "@/app/actions/auth";
import { getUsersForAdmin } from "@/lib/auth";
import { formatDateTime, formatOptionalDateTime } from "@/lib/format";

export default async function AdminUsersPage() {
  const { current, users } = await getUsersForAdmin();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Admin</p>
        <h1>User management</h1>
        <p className="lead">
          Admin-only actions are checked on the server and recorded in the
          security audit log.
        </p>
      </section>

      <section className="table-wrap" aria-label="User list">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Failures</th>
              <th>Locked until</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === current.user.id;
              const locked =
                user.lockedUntil &&
                user.lockedUntil.getTime() > Date.now();

              return (
                <tr key={user.id}>
                  <td data-label="User">
                    <strong>{user.name}</strong>
                    <br />
                    <span>{user.email}</span>
                    {isSelf ? (
                      <>
                        <br />
                        <span className="badge" data-tone="success">
                          You
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td data-label="Role">
                    {user.role === "admin" ? "Admin" : "User"}
                  </td>
                  <td data-label="Status">
                    <span
                      className="badge"
                      data-tone={user.status === "active" ? "success" : "danger"}
                    >
                      {user.status === "active" ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td data-label="Failures">{user.loginFailures}</td>
                  <td data-label="Locked until">
                    {locked ? (
                      <span className="badge" data-tone="warning">
                        {formatOptionalDateTime(user.lockedUntil)}
                      </span>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td data-label="Created">{formatDateTime(user.createdAt)}</td>
                  <td data-label="Actions">
                    <div className="action-row">
                      {user.status === "active" ? (
                        <form action={suspendUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button
                            className="small-button"
                            disabled={isSelf}
                            type="submit"
                          >
                            Suspend
                          </button>
                        </form>
                      ) : (
                        <form action={activateUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="small-button" type="submit">
                            Activate
                          </button>
                        </form>
                      )}
                      <form action={unlockUserAction}>
                        <input name="userId" type="hidden" value={user.id} />
                        <button className="small-button" type="submit">
                          Clear lock
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
