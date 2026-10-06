function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3 ? [...value].map((char) => char + char).join("") : value;
  const number = Number.parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

export function readableOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.42 ? "hsl(0 0% 9%)" : "oklch(0.997 0 0)";
}
