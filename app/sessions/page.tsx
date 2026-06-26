import { revokeSessionAction } from "@/app/actions/auth";
import { getActiveSessionsForCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function SessionsPage() {
  const { sessions } = await getActiveSessionsForCurrentUser();

  return (
    <main className="page section-stack">
      <section>
        <p className="eyebrow">Sessions</p>
        <h1>アクティブセッション</h1>
        <p className="lead">
          現在ログインしているユーザーの有効なセッションを一覧表示し、不要なセッションを個別に無効化できます。
        </p>
      </section>

      {sessions.length === 0 ? (
        <div className="empty">有効なセッションはありません。</div>
      ) : (
        <section className="session-list" aria-label="セッション一覧">
          {sessions.map((session) => (
            <article className="session-row" key={session.id}>
              <div>
                <h2>
                  {session.userAgent}
                  {session.isCurrent ? (
                    <span className="badge" data-tone="success">
                      現在のセッション
                    </span>
                  ) : null}
                </h2>
                <div className="meta-grid">
                  <span>作成日時: {formatDateTime(session.createdAt)}</span>
                  <span>最終利用: {formatDateTime(session.lastUsedAt)}</span>
                  <span>期限: {formatDateTime(session.expiresAt)}</span>
                  <span>IP: {session.ipAddress}</span>
                  <span>
                    種別:{" "}
                    {session.rememberMe ? "Remember me" : "通常セッション"}
                  </span>
                </div>
              </div>
              <form action={revokeSessionAction}>
                <input name="sessionId" type="hidden" value={session.id} />
                <button className="danger-button" type="submit">
                  ログアウト
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
