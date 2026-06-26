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
        <h1>ユーザー管理</h1>
        <p className="lead">
          管理者だけがアクセスできます。停止、停止解除、ログインロック解除はすべてサーバー側でロール確認します。
        </p>
      </section>

      <section className="table-wrap" aria-label="ユーザー一覧">
        <table>
          <thead>
            <tr>
              <th>ユーザー</th>
              <th>ロール</th>
              <th>状態</th>
              <th>失敗回数</th>
              <th>ロック期限</th>
              <th>作成日時</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === current.user.id;
              const locked =
                user.lockedUntil &&
                new Date(user.lockedUntil).getTime() > Date.now();

              return (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <br />
                    <span>{user.email}</span>
                    {isSelf ? (
                      <>
                        <br />
                        <span className="badge" data-tone="success">
                          自分
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td>{user.role === "admin" ? "管理者" : "一般"}</td>
                  <td>
                    <span
                      className="badge"
                      data-tone={user.status === "active" ? "success" : "danger"}
                    >
                      {user.status === "active" ? "有効" : "停止中"}
                    </span>
                  </td>
                  <td>{user.loginFailures}</td>
                  <td>
                    {locked ? (
                      <span className="badge" data-tone="warning">
                        {formatOptionalDateTime(user.lockedUntil)}
                      </span>
                    ) : (
                      "なし"
                    )}
                  </td>
                  <td>{formatDateTime(user.createdAt)}</td>
                  <td>
                    <div className="action-row">
                      {user.status === "active" ? (
                        <form action={suspendUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button
                            className="small-button"
                            disabled={isSelf}
                            type="submit"
                          >
                            停止
                          </button>
                        </form>
                      ) : (
                        <form action={activateUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="small-button" type="submit">
                            停止解除
                          </button>
                        </form>
                      )}
                      <form action={unlockUserAction}>
                        <input name="userId" type="hidden" value={user.id} />
                        <button className="small-button" type="submit">
                          ロック解除
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
