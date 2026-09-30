export function readString(
  params: Record<string, unknown>,
  key: string
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

export function readNumber(
  params: Record<string, unknown>,
  key: string
): number | undefined {
  const value = params[key];
  return typeof value === "number" ? value : undefined;
}
