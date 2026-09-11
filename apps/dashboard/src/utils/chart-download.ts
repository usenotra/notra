import {
  CHART_DOWNLOAD_HEADER,
  CHART_DOWNLOAD_PADDING,
  CHART_DOWNLOAD_PIXEL_RATIO,
  CHART_DOWNLOAD_RADIUS,
  CHART_WORDMARK_EXPORT_OPACITY,
  CHART_WORDMARK_EXPORT_WIDTH_RATIO,
  NOTRA_MARK_BLOB_PATH,
  NOTRA_MARK_FILL,
  NOTRA_MARK_SLASH_PATH,
  NOTRA_WORDMARK_ASPECT,
  NOTRA_WORDMARK_HEIGHT,
  NOTRA_WORDMARK_LETTERS_PATH,
  NOTRA_WORDMARK_WIDTH,
} from "@/constants/chart-wordmark";
import type {
  ChartDownloadFrame,
  ChartDownloadRect,
} from "@/types/chart-download";
import { downloadBlob, sanitizeDownloadFilename } from "@/utils/download";

const TRANSPARENT_BACKGROUNDS = new Set([
  "",
  "transparent",
  "rgba(0, 0, 0, 0)",
]);

export function chartExportSource(
  start: HTMLElement | null
): HTMLElement | null {
  return start?.closest("[data-chart]") ?? start;
}

export function chartExportTitle(source: HTMLElement): string {
  const labeled = source.closest("[data-chart-title]");
  const fromAttr = labeled?.getAttribute("data-chart-title")?.trim();
  if (fromAttr) {
    return fromAttr;
  }

  const card = source.closest("[data-slot=card]");
  const heading = card?.querySelector("[data-slot=card-title]");
  const text = heading?.textContent?.replace(/\s+/g, " ").trim();
  return text || "chart";
}

export function buildChartDownloadFilename(title: string): string {
  const trimmed = title.trim();
  const base =
    sanitizeDownloadFilename(trimmed ? `notra-${trimmed}` : "chart") || "chart";
  return `${base}.png`;
}

export function largestCanvas(
  canvases: readonly Pick<HTMLCanvasElement, "width" | "height">[]
): (typeof canvases)[number] | null {
  let best: (typeof canvases)[number] | null = null;
  let bestArea = 0;
  for (const canvas of canvases) {
    const area = canvas.width * canvas.height;
    if (area > bestArea) {
      best = canvas;
      bestArea = area;
    }
  }
  return best;
}

export function exportFrame(
  chartWidth: number,
  chartHeight: number
): ChartDownloadFrame {
  const padding = CHART_DOWNLOAD_PADDING * CHART_DOWNLOAD_PIXEL_RATIO;
  const header = CHART_DOWNLOAD_HEADER * CHART_DOWNLOAD_PIXEL_RATIO;
  return {
    width: chartWidth + padding * 2,
    height: chartHeight + padding * 2 + header,
    padding,
    header,
    chartX: padding,
    chartY: padding + header,
    chartWidth,
    chartHeight,
  };
}

export function exportWordmarkRect(
  chartWidth: number,
  chartHeight: number,
  chartX: number,
  chartY: number
): ChartDownloadRect {
  const width = chartWidth * CHART_WORDMARK_EXPORT_WIDTH_RATIO;
  const height = width * NOTRA_WORDMARK_ASPECT;
  return {
    x: chartX + (chartWidth - width) / 2,
    y: chartY + (chartHeight - height) / 2,
    width,
    height,
  };
}

export function notraWordmarkSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${NOTRA_WORDMARK_WIDTH}" height="${NOTRA_WORDMARK_HEIGHT}" viewBox="0 0 ${NOTRA_WORDMARK_WIDTH} ${NOTRA_WORDMARK_HEIGHT}" fill="none">
  <g transform="translate(40 40) scale(0.25)">
    <path d="${NOTRA_MARK_BLOB_PATH}" fill="${NOTRA_MARK_FILL}" stroke="${color}" stroke-width="35" stroke-linecap="round"/>
    <path d="${NOTRA_MARK_SLASH_PATH}" stroke="${color}" stroke-width="75" stroke-linecap="round" fill="none"/>
  </g>
  <path d="${NOTRA_WORDMARK_LETTERS_PATH}" fill="${color}"/>
</svg>`;
}

export function cssSurfaceColor(
  source: HTMLElement,
  property: "backgroundColor" | "color"
): string {
  const content = source.querySelector("[data-slot=card-content]");
  const el = content instanceof HTMLElement ? content : source;
  const value = getComputedStyle(el)[property].trim();
  if (property === "backgroundColor" && TRANSPARENT_BACKGROUNDS.has(value)) {
    return getComputedStyle(document.body).backgroundColor;
  }
  return value;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load chart wordmark"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Failed to encode chart PNG"));
    }, "image/png");
  });
}

export async function renderChartPng(
  source: HTMLElement,
  title: string
): Promise<Blob> {
  const canvas = largestCanvas([...source.querySelectorAll("canvas")]);
  if (
    !(canvas instanceof HTMLCanvasElement) ||
    canvas.width === 0 ||
    canvas.height === 0
  ) {
    throw new Error("Chart is not ready");
  }

  const frame = exportFrame(canvas.width, canvas.height);
  const output = document.createElement("canvas");
  output.width = frame.width;
  output.height = frame.height;
  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create chart export");
  }

  const background = cssSurfaceColor(source, "backgroundColor");
  const foreground = cssSurfaceColor(source, "color");
  const radius = CHART_DOWNLOAD_RADIUS * CHART_DOWNLOAD_PIXEL_RATIO;

  ctx.fillStyle = background;
  roundRect(ctx, 0, 0, frame.width, frame.height, radius);
  ctx.fill();

  ctx.drawImage(canvas, frame.chartX, frame.chartY);

  const wordmark = await loadSvgImage(notraWordmarkSvg(foreground));
  const watermark = exportWordmarkRect(
    frame.chartWidth,
    frame.chartHeight,
    frame.chartX,
    frame.chartY
  );
  ctx.save();
  ctx.globalAlpha = CHART_WORDMARK_EXPORT_OPACITY;
  ctx.drawImage(
    wordmark,
    watermark.x,
    watermark.y,
    watermark.width,
    watermark.height
  );
  ctx.restore();

  ctx.fillStyle = foreground;
  ctx.font = `600 ${14 * CHART_DOWNLOAD_PIXEL_RATIO}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(title, frame.padding, frame.padding + frame.header / 2);

  return canvasToBlob(output);
}

export async function downloadChartPng(
  source: HTMLElement,
  title: string,
  filename: string
): Promise<void> {
  const blob = await renderChartPng(source, title);
  downloadBlob(blob, filename);
}
