const MASK_DPR_CAP = 2;

export function createTextMaskDataUrl(
  element: HTMLElement,
  text: string
): string | null {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (width < 1 || height < 1) {
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, MASK_DPR_CAP);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const style = getComputedStyle(element);
  const paddingLeft = Number.parseFloat(style.paddingLeft);
  const paddingRight = Number.parseFloat(style.paddingRight);
  const paddingTop = Number.parseFloat(style.paddingTop);
  const contentWidth = width - paddingLeft - paddingRight;

  context.scale(dpr, dpr);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fff";
  context.font = style.font;
  context.letterSpacing = style.letterSpacing;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  const metrics = context.measureText(text);
  const ascent =
    metrics.fontBoundingBoxAscent ||
    metrics.actualBoundingBoxAscent ||
    Number.parseFloat(style.fontSize) * 0.8;

  context.fillText(text, paddingLeft + contentWidth / 2, paddingTop + ascent);
  return canvas.toDataURL("image/png");
}
