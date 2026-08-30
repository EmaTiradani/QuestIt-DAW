import { prisma } from "@/lib/prisma";

const SEED_USER_EMAIL = "seed-user@questit.local";

/**
 * Returns the id of the current user.
 *
 * TEMPORARY: there is no authentication yet (RF-01 to RF-03 are out of scope
 * for FEAT-001). Every request is attributed to the single seeded user until
 * an authentication ticket introduces real sessions/credentials. This stub
 * is meant to be replaced wholesale by that ticket, not extended.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: SEED_USER_EMAIL },
  });

  return user.id;
}
