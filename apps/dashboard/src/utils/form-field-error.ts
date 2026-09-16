export function firstFieldErrorMessage(
  errors: readonly unknown[]
): string | null {
  const [error] = errors;
  if (!error) {
    return null;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && "message" in error) {
    return typeof error.message === "string" ? error.message : "Invalid value";
  }
  return "Invalid value";
}
