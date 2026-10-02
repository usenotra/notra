import type { DitherPointerOffset } from "@/types/dithering";

function clampUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function getDitherPointerOffset(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  range: number,
  visibleYRatio = 1
): DitherPointerOffset {
  const width = rect.width || 1;
  const height = rect.height || 1;
  const ySpan = height * Math.max(visibleYRatio, 0.01);
  const nx = clampUnit(((clientX - rect.left) / width) * 2 - 1);
  const ny = clampUnit(((clientY - rect.top) / ySpan) * 2 - 1);

  return {
    offsetX: nx * range,
    offsetY: ny * range,
  };
}
