/** Combine fallback scopes without repeating verification (and quota consumption). */
export function unkeyPermissions(
  permission?: string,
  legacyPermissions: readonly string[] = []
): string | undefined {
  const permissions = [...new Set([permission, ...legacyPermissions])].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (permissions.length < 2) {
    return permissions[0];
  }
  return permissions.map((value) => `(${value})`).join(" OR ");
}
