import { createHash, randomInt } from "node:crypto";

import { db } from "@notra/db/drizzle";
import { userBackupCodes } from "@notra/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import {
  BACKUP_CODE_ALPHABET,
  BACKUP_CODE_COUNT,
  BACKUP_CODE_LENGTH,
} from "@/constants/security";

const BACKUP_CODE_SEPARATOR_REGEX = /[\s-]/g;

function normalizeBackupCode(code: string): string {
  return code.toLowerCase().replace(BACKUP_CODE_SEPARATOR_REGEX, "");
}

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

/** Replaces every existing code for the user and returns the new plaintext set. */
export async function replaceBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
  await db.transaction(async (tx) => {
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
  await db.delete(userBackupCodes).where(eq(userBackupCodes.userId, userId));
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

/** True when `code` matches one of the user's unused backup codes. */
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
