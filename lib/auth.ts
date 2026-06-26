import {
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
  type Session,
  type User
} from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "./prisma";
import type { PublicSession, PublicUser, SessionRecord } from "./types";

export const AUTH_COOKIE_NAME = "auth_app_session";
export const REGULAR_SESSION_MS = 2 * 60 * 60 * 1000;
export const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type CurrentSession = {
  user: PublicUser;
  session: Omit<SessionRecord, "tokenHash">;
};

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === PrismaUserRole.ADMIN ? "admin" : "user",
    status: user.status === PrismaUserStatus.SUSPENDED ? "suspended" : "active",
    loginFailures: user.loginFailures,
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function toSessionRecord(session: Session): SessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    tokenHash: session.tokenHash,
    rememberMe: session.rememberMe,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt
  };
}

function toCookieSession(session: SessionRecord) {
  return {
    id: session.id,
    userId: session.userId,
    rememberMe: session.rememberMe,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt
  };
}

export function getSessionDuration(rememberMe: boolean) {
  return rememberMe ? REMEMBER_SESSION_MS : REGULAR_SESSION_MS;
}

export function getCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  };
}

export async function getRequestMetadata() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local";

  return {
    ipAddress,
    userAgent: headerStore.get("user-agent") || "Unknown browser"
  };
}

export function buildSessionRecord(params: {
  userId: string;
  token: string;
  rememberMe: boolean;
  ipAddress: string;
  userAgent: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + getSessionDuration(params.rememberMe));

  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    tokenHash: hashToken(params.token),
    rememberMe: params.rememberMe,
    userAgent: params.userAgent.slice(0, 240),
    ipAddress: params.ipAddress.slice(0, 80),
    createdAt: now,
    lastUsedAt: now,
    expiresAt,
    revokedAt: null
  } satisfies SessionRecord;
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!session || session.revokedAt) {
    return null;
  }

  if (session.expiresAt.getTime() <= now.getTime()) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now }
    });
    return null;
  }

  if (session.user.status !== PrismaUserStatus.ACTIVE) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now }
    });
    return null;
  }

  const updatedSession = await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: now }
  });

  return {
    user: toPublicUser(session.user),
    session: toCookieSession(toSessionRecord(updatedSession))
  };
}

export async function requireUser() {
  const current = await getCurrentSession();

  if (!current) {
    redirect("/login");
  }

  return current;
}

export async function requireAdmin() {
  const current = await requireUser();

  if (current.user.role !== "admin") {
    redirect("/dashboard");
  }

  return current;
}

export async function getActiveSessionsForCurrentUser() {
  const current = await requireUser();
  const now = new Date();

  const sessions: PublicSession[] = (
    await prisma.session.findMany({
      where: {
        userId: current.user.id,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      orderBy: { lastUsedAt: "desc" }
    })
  ).map((session) => {
    const safeSession = toCookieSession(toSessionRecord(session));
    return {
      ...safeSession,
      isCurrent: safeSession.id === current.session.id
    };
  });

  return { current, sessions };
}

export async function getUsersForAdmin() {
  const current = await requireAdmin();
  const users = (
    await prisma.user.findMany({
      orderBy: { email: "asc" }
    })
  ).map(toPublicUser);

  return { current, users };
}
