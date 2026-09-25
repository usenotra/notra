const BACKUP_CODE_SEPARATOR_REGEX = /[\s-]/g;

export function normalizeBackupCode(code: string): string {
  return code.toLowerCase().replace(BACKUP_CODE_SEPARATOR_REGEX, "");
}
