import { headers } from "next/headers";
import { prisma } from "./prisma";

export type SecurityEventType =
  | "signup"
  | "login_success"
  | "login_failure"
  | "logout"
  | "session_revoked"
  | "other_sessions_revoked"
  | "password_changed"
  | "admin_user_suspended"
  | "admin_user_activated"
  | "admin_user_unlocked"
  | "csrf_blocked";

export async function assertSameOriginRequest() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host =
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    "";

  if (!origin || !host) {
    return;
  }

  const originHost = new URL(origin).host;

  if (originHost !== host) {
    await recordSecurityEvent({
      type: "csrf_blocked",
      summary: `Blocked cross-origin form submission from ${originHost}.`
    });
    throw new Error("Invalid request origin.");
  }
}

export async function recordSecurityEvent(params: {
  type: SecurityEventType;
  summary: string;
  userId?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.securityEvent.create({
    data: {
      type: params.type,
      summary: params.summary.slice(0, 280),
      userId: params.userId ?? null,
      actorUserId: params.actorUserId ?? null,
      ipAddress: params.ipAddress?.slice(0, 80) ?? null,
      userAgent: params.userAgent?.slice(0, 240) ?? null
    }
  });
}
