import { db } from "@notra/db/drizzle";
import { userAuthFactorLabels } from "@notra/db/schema";
import { eq } from "drizzle-orm";

export async function setFactorLabel(
  userId: string,
  factorId: string,
  name: string
): Promise<void> {
  await db
    .insert(userAuthFactorLabels)
    .values({ id: crypto.randomUUID(), userId, factorId, name })
    .onConflictDoUpdate({
      target: userAuthFactorLabels.factorId,
      set: { name },
    });
}

/** Factor id → name for every labelled factor of the user. */
export async function listFactorLabels(
  userId: string
): Promise<Map<string, string>> {
  const rows = await db
    .select({
      factorId: userAuthFactorLabels.factorId,
      name: userAuthFactorLabels.name,
    })
    .from(userAuthFactorLabels)
    .where(eq(userAuthFactorLabels.userId, userId));
  return new Map(rows.map((row) => [row.factorId, row.name]));
}

export async function deleteFactorLabel(factorId: string): Promise<void> {
  await db
    .delete(userAuthFactorLabels)
    .where(eq(userAuthFactorLabels.factorId, factorId));
}

export async function clearFactorLabels(userId: string): Promise<void> {
  await db
    .delete(userAuthFactorLabels)
    .where(eq(userAuthFactorLabels.userId, userId));
}
