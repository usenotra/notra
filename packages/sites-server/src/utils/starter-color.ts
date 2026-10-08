import { HEX, RGB } from "../constants/starter";
export function normalizeHexColor(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim() ?? "";
  const hex = HEX.exec(trimmed)?.[1];
  if (hex) {
    const full =
      hex.length <= 4
        ? [...hex.slice(0, 3)].map((digit) => digit + digit).join("")
        : hex.slice(0, 6);
    return `#${full.toLowerCase()}`;
  }
  const rgb = RGB.exec(trimmed);
  if (rgb) {
    const toHex = (channel: string | undefined) =>
      Math.round(Math.min(Math.max(Number(channel ?? 0), 0), 255))
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return null;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    Math.floor(value / 65_536) / 255,
    (Math.floor(value / 256) % 256) / 255,
    (value % 256) / 255,
  ];
}

export function isAccentColor(hex: string): boolean {
  const [red, green, blue] = channels(hex);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) {
    return false;
  }
  const saturation =
    (max - min) / (1 - Math.abs(2 * lightness - 1) || Number.EPSILON);
  return saturation > 0.25 && lightness > 0.15 && lightness < 0.85;
}
