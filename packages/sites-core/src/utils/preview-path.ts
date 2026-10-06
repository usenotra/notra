export function safePreviewNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/") || next.includes("\\")) {
    return "/";
  }
  try {
    const base = "https://preview.invalid";
    const resolved = new URL(next, base);
    if (resolved.origin !== base) {
      return "/";
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}
