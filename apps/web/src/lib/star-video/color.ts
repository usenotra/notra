const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHex(input: string): string | null {
  if (!HEX_COLOR.test(input)) {
    return null;
  }
  const hex = input.slice(1);
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((char) => char + char)
      .join("")}`.toLowerCase();
  }
  return `#${hex}`.toLowerCase();
}
