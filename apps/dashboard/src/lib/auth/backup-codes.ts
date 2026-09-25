import { createHash, randomInt } from "node:crypto";

import { db } from "@notra/db/drizzle";
import { userBackupCodes } from "@notra/db/schema";
import { BACKUP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import { normalizeBackupCode } from "@notra/schemas/utils/auth";
import { and, eq, isNull, sql } from "drizzle-orm";

import { BACKUP_CODE_ALPHABET, BACKUP_CODE_COUNT } from "@/constants/security";

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

const lockBackupCodes = (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string
) => tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

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

export async function hasUnusedBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: userBackupCodes.id })
    .from(userBackupCodes)
    .where(
      and(
        eq(userBackupCodes.userId, userId),
        eq(userBackupCodes.codeHash, hashBackupCode(code)),
        isNull(userBackupCodes.usedAt)
      )
    )
    .limit(1);
  return Boolean(row);
}

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
