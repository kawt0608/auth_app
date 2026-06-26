"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  buildSessionRecord,
  createSessionToken,
  getCookieOptions,
  getCurrentSession,
  getRequestMetadata,
  getSessionDuration,
  requireAdmin
} from "@/lib/auth";
import {
  findActiveLock,
  getLockMessage,
  getLoginAttemptKeys,
  getNextFailedAttempt,
  normalizeEmail
} from "@/lib/login-security";
import { isAcceptablePassword } from "@/lib/password-strength";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security";

export type ActionState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128)
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter a password.").max(128),
  confirmPassword: z.string().min(1, "Confirm your password.").max(128)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: z.string().min(1, "Enter a new password.").max(128),
  confirmPassword: z.string().min(1, "Confirm your new password.").max(128)
});

function validationError(error: z.ZodError) {
  return {
    error: error.issues[0]?.message ?? "Check the form values."
  };
}

async function sameOriginOrError() {
  try {
    await assertSameOriginRequest();
    return null;
  } catch {
    return { error: "Request origin could not be verified." };
  }
}

async function recordFailedLogin(
  tx: Prisma.TransactionClient,
  keys: string[],
  userId: string | undefined,
  now: Date
) {
  const attempts = await tx.loginAttempt.findMany({
    where: { key: { in: keys } }
  });
  const nextByKey = new Map<string, ReturnType<typeof getNextFailedAttempt>>();

  for (const key of keys) {
    const existing = attempts.find((attempt) => attempt.key === key) ?? null;
    const nextAttempt = getNextFailedAttempt(existing, now);
    nextByKey.set(key, nextAttempt);

    await tx.loginAttempt.upsert({
      where: { key },
      create: {
        key,
        failures: nextAttempt.failures,
        firstFailureAt: nextAttempt.firstFailureAt,
        lockedUntil: nextAttempt.lockedUntil
      },
      update: {
        failures: nextAttempt.failures,
        firstFailureAt: nextAttempt.firstFailureAt,
        lockedUntil: nextAttempt.lockedUntil
      }
    });
  }

  if (userId) {
    const emailAttempt = nextByKey.get(keys[0]);

    await tx.user.update({
      where: { id: userId },
      data: {
        loginFailures: { increment: 1 },
        lockedUntil: emailAttempt?.lockedUntil ?? null
      }
    });
  }
}

async function clearUserLoginFailures(
  tx: Prisma.TransactionClient,
  email: string,
  userId: string,
  ipAddress?: string,
  clearActiveIpLocks = false
) {
  const keys = [`email:${normalizeEmail(email)}`];
  if (ipAddress) {
    keys.push(`ip:${ipAddress}`);
  }

  await tx.loginAttempt.deleteMany({
    where: {
      OR: [
        { key: { in: keys } },
        ...(clearActiveIpLocks ? [{ key: { startsWith: "ip:" } }] : [])
      ]
    }
  });
  await tx.user.update({
    where: { id: userId },
    data: {
      loginFailures: 0,
      lockedUntil: null
    }
  });
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const originError = await sameOriginOrError();
  if (originError) {
    return originError;
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const email = normalizeEmail(parsed.data.email);
  const rememberMe = formData.get("rememberMe") === "on";
  const { ipAddress, userAgent } = await getRequestMetadata();
  const attemptKeys = getLoginAttemptKeys(email, ipAddress);
  const now = new Date();

  const attempts = await prisma.loginAttempt.findMany({
    where: { key: { in: attemptKeys } }
  });
  const activeAttemptLock = findActiveLock(attempts, now);

  if (activeAttemptLock) {
    return { error: getLockMessage(activeAttemptLock) };
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (user?.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    return { error: getLockMessage(user.lockedUntil) };
  }

  if (!user) {
    await prisma.$transaction(async (tx) => {
      await recordFailedLogin(tx, attemptKeys, undefined, now);
      await tx.securityEvent.create({
        data: {
          type: "login_failure",
          summary: `Failed login for unknown email ${email}.`,
          ipAddress,
          userAgent
        }
      });
    });
    return {
      error: "Email or password is incorrect."
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      error: "This account is suspended. Contact an administrator."
    };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    await prisma.$transaction(async (tx) => {
      await recordFailedLogin(tx, attemptKeys, user.id, now);
      await tx.securityEvent.create({
        data: {
          type: "login_failure",
          summary: "Failed login with an incorrect password.",
          userId: user.id,
          ipAddress,
          userAgent
        }
      });
    });
    return {
      error: "Email or password is incorrect."
    };
  }

  const token = createSessionToken();
  const expiresAt = new Date(now.getTime() + getSessionDuration(rememberMe));

  await prisma.$transaction(async (tx) => {
    await clearUserLoginFailures(tx, email, user.id, ipAddress);
    await tx.session.create({
      data: buildSessionRecord({
        userId: user.id,
        token,
        rememberMe,
        ipAddress,
        userAgent,
        now
      })
    });
    await tx.securityEvent.create({
      data: {
        type: "login_success",
        summary: rememberMe
          ? "Signed in with Remember me enabled."
          : "Signed in with a regular session.",
        userId: user.id,
        ipAddress,
        userAgent
      }
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getCookieOptions(expiresAt));
  redirect("/dashboard");
}

export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const originError = await sameOriginOrError();
  if (originError) {
    return originError;
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (!isAcceptablePassword(parsed.data.password)) {
    return {
      error:
        "Use a stronger password with length, mixed case, number, and symbol coverage."
    };
  }

  const email = normalizeEmail(parsed.data.email);
  const { ipAddress, userAgent } = await getRequestMetadata();
  const token = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getSessionDuration(false));

  try {
    await prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const user = await tx.user.create({
        data: {
          name: parsed.data.name.trim(),
          email,
          passwordHash
        }
      });

      await tx.session.create({
        data: buildSessionRecord({
          userId: user.id,
          token,
          rememberMe: false,
          ipAddress,
          userAgent,
          now
        })
      });
      await tx.securityEvent.create({
        data: {
          type: "signup",
          summary: "Account created and signed in.",
          userId: user.id,
          ipAddress,
          userAgent
        }
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "This email address is already registered."
      };
    }

    return {
      error: "Could not create the account. Try again later."
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getCookieOptions(expiresAt));
  redirect("/dashboard");
}

export async function logoutAction() {
  await assertSameOriginRequest();
  const cookieStore = await cookies();
  const current = await getCurrentSession();
  const { ipAddress, userAgent } = await getRequestMetadata();

  if (current) {
    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: {
          id: current.session.id,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
      await tx.securityEvent.create({
        data: {
          type: "logout",
          summary: "Signed out of the current session.",
          userId: current.user.id,
          ipAddress,
          userAgent
        }
      });
    });
  }

  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}

export async function revokeSessionAction(formData: FormData) {
  await assertSameOriginRequest();
  const sessionId = String(formData.get("sessionId") ?? "");
  const current = await getCurrentSession();

  if (!current || !sessionId) {
    redirect("/login");
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: current.user.id
    }
  });

  if (!session) {
    redirect("/sessions");
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });
    await tx.securityEvent.create({
      data: {
        type: "session_revoked",
        summary:
          session.id === current.session.id
            ? "Revoked the current session."
            : "Revoked another active session.",
        userId: current.user.id,
        actorUserId: current.user.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      }
    });
  });

  revalidatePath("/sessions");
  revalidatePath("/security");

  if (session.id === current.session.id) {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    redirect("/login");
  }

  redirect("/sessions");
}

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const originError = await sameOriginOrError();
  if (originError) {
    return originError;
  }

  const current = await getCurrentSession();
  if (!current) {
    redirect("/login");
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { error: "New passwords do not match." };
  }

  if (!isAcceptablePassword(parsed.data.newPassword)) {
    return { error: "Choose a stronger new password." };
  }

  const user = await prisma.user.findUnique({
    where: { id: current.user.id }
  });

  if (!user) {
    redirect("/login");
  }

  const currentPasswordMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );

  if (!currentPasswordMatches) {
    return { error: "Current password is incorrect." };
  }

  const reusesCurrentPassword = await bcrypt.compare(
    parsed.data.newPassword,
    user.passwordHash
  );

  if (reusesCurrentPassword) {
    return { error: "Use a new password that is different from the current one." };
  }

  const { ipAddress, userAgent } = await getRequestMetadata();
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        loginFailures: 0,
        lockedUntil: null
      }
    });
    await tx.loginAttempt.deleteMany({
      where: { key: `email:${user.email}` }
    });
    await tx.session.updateMany({
      where: {
        userId: user.id,
        id: { not: current.session.id },
        revokedAt: null
      },
      data: { revokedAt: now }
    });
    await tx.securityEvent.create({
      data: {
        type: "password_changed",
        summary: "Password changed and other sessions were revoked.",
        userId: user.id,
        actorUserId: user.id,
        ipAddress,
        userAgent
      }
    });
  });

  revalidatePath("/security");
  revalidatePath("/sessions");
  return { success: "Password changed. Other sessions were signed out." };
}

export async function logoutOtherSessionsAction() {
  await assertSameOriginRequest();
  const current = await getCurrentSession();

  if (!current) {
    redirect("/login");
  }

  const { ipAddress, userAgent } = await getRequestMetadata();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: {
        userId: current.user.id,
        id: { not: current.session.id },
        revokedAt: null
      },
      data: { revokedAt: now }
    });
    await tx.securityEvent.create({
      data: {
        type: "other_sessions_revoked",
        summary: "Signed out all other active sessions.",
        userId: current.user.id,
        actorUserId: current.user.id,
        ipAddress,
        userAgent
      }
    });
  });

  revalidatePath("/security");
  revalidatePath("/sessions");
  redirect("/security");
}

export async function suspendUserAction(formData: FormData) {
  await assertSameOriginRequest();
  const { current, userId } = await getUsersAndTarget(formData);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        NOT: { id: current.user.id }
      },
      data: {
        status: "SUSPENDED"
      }
    });

    if (updated.count > 0) {
      await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });
      await tx.securityEvent.create({
        data: {
          type: "admin_user_suspended",
          summary: `Admin suspended user ${userId}.`,
          userId,
          actorUserId: current.user.id
        }
      });
    }
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  redirect("/admin/users");
}

export async function activateUserAction(formData: FormData) {
  await assertSameOriginRequest();
  const { current, userId } = await getUsersAndTarget(formData);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId },
      data: {
        status: "ACTIVE"
      }
    });

    if (updated.count > 0) {
      await tx.securityEvent.create({
        data: {
          type: "admin_user_activated",
          summary: `Admin activated user ${userId}.`,
          userId,
          actorUserId: current.user.id
        }
      });
    }
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  redirect("/admin/users");
}

export async function unlockUserAction(formData: FormData) {
  await assertSameOriginRequest();
  const { current, userId } = await getUsersAndTarget(formData);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!target) {
      return;
    }

    await clearUserLoginFailures(tx, target.email, target.id, undefined, true);
    await tx.securityEvent.create({
      data: {
        type: "admin_user_unlocked",
        summary: `Admin cleared login lock for ${target.email}.`,
        userId: target.id,
        actorUserId: current.user.id
      }
    });
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  redirect("/admin/users");
}

async function getUsersAndTarget(formData: FormData) {
  const current = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect("/admin/users");
  }

  return { current, userId };
}
