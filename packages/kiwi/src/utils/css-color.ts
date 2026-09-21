export function normalizeCssColorWithContext(
  value: string,
  context: Pick<CanvasRenderingContext2D, "fillStyle">
): string | null {
  const previous = context.fillStyle;
  try {
    context.fillStyle = "#010203";
    context.fillStyle = value;
    const first = context.fillStyle;

    context.fillStyle = "#040506";
    context.fillStyle = value;
    const second = context.fillStyle;

    return typeof first === "string" && first === second ? first : null;
  } finally {
    context.fillStyle = previous;
  }
}
