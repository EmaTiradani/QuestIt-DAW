import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_USER_EMAIL = "seed-user@questit.local";

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: {},
    create: {
      email: SEED_USER_EMAIL,
      xp: 0,
    },
  });

  console.log(`Seed user ready: ${user.id} (${user.email}), xp=${user.xp}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
