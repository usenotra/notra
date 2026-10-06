export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isNotFoundError(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 404;
}
