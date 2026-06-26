import type { LoginAttemptRecord } from "./types";

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_LOCK_MS = 5 * 60 * 1000;

export type NextFailedAttempt = {
  failures: number;
  firstFailureAt: Date;
  lockedUntil: Date | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getLoginAttemptKeys(email: string, ipAddress: string) {
  return [`email:${normalizeEmail(email)}`, `ip:${ipAddress}`];
}

export function getLockMessage(lockedUntil: Date | string) {
  const remainingMs = Math.max(
    0,
    new Date(lockedUntil).getTime() - Date.now()
  );
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  return `Too many failed sign-in attempts. Try again in about ${remainingMinutes} minute(s).`;
}

export function findActiveLock(
  attempts: Pick<LoginAttemptRecord, "lockedUntil">[],
  now = new Date()
) {
  return (
    attempts.find(
      (attempt) =>
        attempt.lockedUntil && attempt.lockedUntil.getTime() > now.getTime()
    )?.lockedUntil ?? null
  );
}

export function getNextFailedAttempt(
  attempt: Pick<LoginAttemptRecord, "failures" | "firstFailureAt"> | null,
  now = new Date()
): NextFailedAttempt {
  const insideWindow =
    attempt &&
    now.getTime() - attempt.firstFailureAt.getTime() <= LOGIN_WINDOW_MS;
  const failures = (insideWindow ? attempt.failures : 0) + 1;

  return {
    failures,
    firstFailureAt: insideWindow ? attempt.firstFailureAt : now,
    lockedUntil:
      failures >= LOGIN_MAX_FAILURES
        ? new Date(now.getTime() + LOGIN_LOCK_MS)
        : null
  };
}
