export function isFailedToolOutput(output: unknown): boolean {
  if (output === null || typeof output !== "object") {
    return false;
  }

  const record = output as Record<string, unknown>;
  return record.success === false || record.isError === true;
}
