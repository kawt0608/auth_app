export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  loginFailures: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  rememberMe: boolean;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type LoginAttemptRecord = {
  key: string;
  failures: number;
  firstFailureAt: Date;
  lockedUntil: Date | null;
};

export type PublicUser = Omit<UserRecord, "passwordHash">;

export type PublicSession = Omit<SessionRecord, "tokenHash"> & {
  isCurrent: boolean;
};

export type SecurityEventRecord = {
  id: string;
  userId: string | null;
  actorUserId: string | null;
  type: string;
  summary: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};
