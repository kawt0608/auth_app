import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const [userPasswordHash, adminPasswordHash] = await Promise.all([
    bcrypt.hash("Password123!", 12),
    bcrypt.hash("AdminPassword123!", 12)
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: { userId: { in: ["user_demo", "admin_demo"] } }
    });
    await tx.loginAttempt.deleteMany({
      where: {
        key: {
          in: ["email:user@example.com", "email:admin@example.com"]
        }
      }
    });

    await tx.user.upsert({
      where: { email: "user@example.com" },
      create: {
        id: "user_demo",
        name: "Demo User",
        email: "user@example.com",
        passwordHash: userPasswordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE
      },
      update: {
        name: "Demo User",
        passwordHash: userPasswordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        loginFailures: 0,
        lockedUntil: null
      }
    });

    await tx.user.upsert({
      where: { email: "admin@example.com" },
      create: {
        id: "admin_demo",
        name: "Admin User",
        email: "admin@example.com",
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      },
      update: {
        name: "Admin User",
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        loginFailures: 0,
        lockedUntil: null
      }
    });
  });

  console.log("Seeded demo users in PostgreSQL.");
  console.log("user@example.com / Password123!");
  console.log("admin@example.com / AdminPassword123!");
}

main()
  .catch((error) => {
    console.error("Failed to seed database.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
