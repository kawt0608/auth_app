"use server";

import {
  Prisma,
  UserStatus as PrismaUserStatus
} from "@prisma/client";
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

export type ActionState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません").max(254),
  password: z.string().min(1, "パスワードを入力してください").max(128)
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(80),
  email: z.string().email("メールアドレスの形式が正しくありません").max(254),
  password: z.string().min(1, "パスワードを入力してください").max(128)
});

function validationError(error: z.ZodError) {
  return {
    error: error.issues[0]?.message ?? "入力内容を確認してください"
  };
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
  userId: string
) {
  await tx.loginAttempt.deleteMany({
    where: { key: `email:${normalizeEmail(email)}` }
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

  if (
    user?.lockedUntil &&
    user.lockedUntil.getTime() > now.getTime()
  ) {
    return { error: getLockMessage(user.lockedUntil) };
  }

  if (!user) {
    await prisma.$transaction((tx) =>
      recordFailedLogin(tx, attemptKeys, undefined, now)
    );
    return {
      error: "メールアドレスまたはパスワードが正しくありません。"
    };
  }

  if (user.status !== PrismaUserStatus.ACTIVE) {
    return {
      error: "このアカウントは停止されています。管理者に連絡してください。"
    };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    await prisma.$transaction((tx) =>
      recordFailedLogin(tx, attemptKeys, user.id, now)
    );
    return {
      error: "メールアドレスまたはパスワードが正しくありません。"
    };
  }

  const token = createSessionToken();
  const expiresAt = new Date(now.getTime() + getSessionDuration(rememberMe));

  await prisma.$transaction(async (tx) => {
    await clearUserLoginFailures(tx, email, user.id);
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
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getCookieOptions(expiresAt));
  redirect("/dashboard");
}

export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!isAcceptablePassword(parsed.data.password)) {
    return {
      error:
        "パスワードは10文字以上で、大文字・小文字・数字・記号のうち4項目以上を満たしてください。"
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
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "このメールアドレスはすでに登録されています。"
      };
    }

    return {
      error: "アカウントを作成できませんでした。時間をおいて再試行してください。"
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getCookieOptions(expiresAt));
  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const current = await getCurrentSession();

  if (current) {
    await prisma.session.updateMany({
      where: {
        id: current.session.id,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}

export async function revokeSessionAction(formData: FormData) {
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

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });

  revalidatePath("/sessions");

  if (session.id === current.session.id) {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    redirect("/login");
  }

  redirect("/sessions");
}

export async function suspendUserAction(formData: FormData) {
  const { current, userId } = await getUsersAndTarget(formData);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        NOT: { id: current.user.id }
      },
      data: {
        status: PrismaUserStatus.SUSPENDED
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
    }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function activateUserAction(formData: FormData) {
  const { userId } = await getUsersAndTarget(formData);

  await prisma.user.updateMany({
    where: { id: userId },
    data: {
      status: PrismaUserStatus.ACTIVE
    }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function unlockUserAction(formData: FormData) {
  const { userId } = await getUsersAndTarget(formData);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!target) {
      return;
    }

    await clearUserLoginFailures(tx, target.email, target.id);
  });

  revalidatePath("/admin/users");
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
