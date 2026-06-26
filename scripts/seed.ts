import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const demoUserIds = ["user_demo", "admin_demo"];
const resetDatabase = process.argv.includes("--reset");

async function main() {
  const [userPasswordHash, adminPasswordHash] = await Promise.all([
    bcrypt.hash("Password123!", 12),
    bcrypt.hash("AdminPassword123!", 12)
  ]);

  await prisma.$transaction(async (tx) => {
    if (resetDatabase) {
      await tx.securityEvent.deleteMany();
      await tx.session.deleteMany();
      await tx.loginAttempt.deleteMany();
      await tx.user.deleteMany();
    } else {
      await tx.session.deleteMany({
        where: { userId: { in: demoUserIds } }
      });
      await tx.loginAttempt.deleteMany({
        where: {
          key: {
            in: ["email:user@example.com", "email:admin@example.com"]
          }
        }
      });
      await tx.securityEvent.deleteMany({
        where: {
          OR: [
            { userId: { in: demoUserIds } },
            { actorUserId: { in: demoUserIds } }
          ]
        }
      });
    }

    await tx.user.upsert({
      where: { email: "user@example.com" },
      create: {
        id: "user_demo",
        name: "Demo User",
        email: "user@example.com",
        passwordHash: userPasswordHash,
        role: "USER",
        status: "ACTIVE"
      },
      update: {
        name: "Demo User",
        passwordHash: userPasswordHash,
        role: "USER",
        status: "ACTIVE",
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
        role: "ADMIN",
        status: "ACTIVE"
      },
      update: {
        name: "Admin User",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        status: "ACTIVE",
        loginFailures: 0,
        lockedUntil: null
      }
    });

    await tx.securityEvent.createMany({
      data: [
        {
          userId: "user_demo",
          type: "seed",
          summary: "Demo user account was seeded."
        },
        {
          userId: "admin_demo",
          type: "seed",
          summary: "Demo admin account was seeded."
        }
      ]
    });
  });

  console.log("Seeded demo users.");
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
