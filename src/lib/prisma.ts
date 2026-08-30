import { PrismaClient } from "@prisma/client";

// Standard Next.js + Prisma singleton: in dev, hot-reload re-evaluates this
// module on every change, which would otherwise open a new PrismaClient (and
// a new connection pool) each time. Stashing the instance on `globalThis`
// survives the reload; in production a fresh module instance is created once.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
