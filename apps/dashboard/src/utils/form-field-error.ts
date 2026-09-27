export function firstFieldErrorMessage(
  errors: readonly unknown[],
  fallback: string
): string | null {
  const [error] = errors;
  if (!error) {
    return null;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}
