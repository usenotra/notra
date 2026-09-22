import { createHash, randomInt } from "node:crypto";

import { db } from "@notra/db/drizzle";
import { userBackupCodes } from "@notra/db/schema";
import { BACKUP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import { normalizeBackupCode } from "@notra/schemas/utils/auth";
import { and, eq, isNull, sql } from "drizzle-orm";

import { BACKUP_CODE_ALPHABET, BACKUP_CODE_COUNT } from "@/constants/security";

/** Codes are 40+ bits of randomness, so a plain SHA-256 is enough at rest. */
function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

function generateBackupCode(): string {
  let code = "";
  for (let index = 0; index < BACKUP_CODE_LENGTH; index += 1) {
    code += BACKUP_CODE_ALPHABET[randomInt(BACKUP_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Serializes writes to one user's codes for the rest of the transaction.
 * Without it two overlapping regenerations each delete the rows they can
 * see and both insert, leaving the user with two valid sets.
 */
const lockBackupCodes = (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string
) => tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

/** Replaces every existing code for the user and returns the new plaintext set. */
export async function replaceBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
  await db.transaction(async (tx) => {
    await lockBackupCodes(tx, userId);
    await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, userId));
    await tx.insert(userBackupCodes).values(
      codes.map((code) => ({
        id: crypto.randomUUID(),
        userId,
        codeHash: hashBackupCode(code),
      }))
    );
  });
  return codes;
}

export async function clearBackupCodes(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockBackupCodes(tx, userId);
    await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, userId));
  });
}

/**
 * Hands a consumed code back when the change it authorized did not happen,
 * so a transient failure does not cost the user a recovery option.
 */
export async function restoreBackupCode(
  userId: string,
  code: string
): Promise<void> {
  await db
    .update(userBackupCodes)
    .set({ usedAt: null })
    .where(
      and(
        eq(userBackupCodes.userId, userId),
        eq(userBackupCodes.codeHash, hashBackupCode(code))
      )
    );
}

export async function countRemainingBackupCodes(
  userId: string
): Promise<number> {
  const rows = await db
    .select({ id: userBackupCodes.id })
    .from(userBackupCodes)
    .where(
      and(eq(userBackupCodes.userId, userId), isNull(userBackupCodes.usedAt))
    );
  return rows.length;
}

export async function hasBackupCodes(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBackupCodes.id })
    .from(userBackupCodes)
    .where(eq(userBackupCodes.userId, userId))
    .limit(1);
  return Boolean(row);
}

/**
 * Marks `code` as used and reports whether it was an unused code of the
 * user. A single conditional update, so two requests racing on the same
 * code cannot both succeed.
 */
export async function consumeBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const rows = await db
    .update(userBackupCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(userBackupCodes.userId, userId),
        eq(userBackupCodes.codeHash, hashBackupCode(code)),
        isNull(userBackupCodes.usedAt)
      )
    )
    .returning({ id: userBackupCodes.id });
  return rows.length > 0;
}
