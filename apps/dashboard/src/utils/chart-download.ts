import { notraMarkSvg } from "@notra/ui/lib/notra-mark";

import {
  CHART_DOWNLOAD_HEADER,
  CHART_DOWNLOAD_PADDING,
  CHART_DOWNLOAD_PIXEL_RATIO,
  CHART_DOWNLOAD_RADIUS,
  CHART_DOWNLOAD_TITLE_SIZE,
  CHART_MARK_EXPORT_GAP_RATIO,
  CHART_MARK_EXPORT_OPACITY,
  CHART_MARK_EXPORT_SIZE_RATIO,
  CHART_MARK_EXPORT_WORD_SIZE_RATIO,
  CHART_MARK_WORD,
} from "@/constants/chart-download";
import type { ChartDownloadFrame } from "@/types/chart-download";
import { downloadBlob, sanitizeDownloadFilename } from "@/utils/download";

const TRANSPARENT_BACKGROUNDS = new Set([
  "",
  "transparent",
  "rgba(0, 0, 0, 0)",
]);

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

function largestCanvas(
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

function exportScale(canvas: HTMLCanvasElement): number {
  const cssWidth = canvas.clientWidth;
  if (cssWidth <= 0) {
    return CHART_DOWNLOAD_PIXEL_RATIO;
  }
  return canvas.width / cssWidth;
}

function exportFrame(
  chartWidth: number,
  chartHeight: number,
  pixelRatio = CHART_DOWNLOAD_PIXEL_RATIO
): ChartDownloadFrame {
  const padding = CHART_DOWNLOAD_PADDING * pixelRatio;
  const header = CHART_DOWNLOAD_HEADER * pixelRatio;
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

function paintExportLockup(
  ctx: CanvasRenderingContext2D,
  mark: HTMLImageElement,
  color: string,
  chartWidth: number,
  chartHeight: number,
  chartX: number,
  chartY: number
) {
  const markSize =
    Math.min(chartWidth, chartHeight) * CHART_MARK_EXPORT_SIZE_RATIO;
  const fontSize = markSize * CHART_MARK_EXPORT_WORD_SIZE_RATIO;
  const gap = markSize * CHART_MARK_EXPORT_GAP_RATIO;
  ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const wordWidth = ctx.measureText(CHART_MARK_WORD).width;
  const x = chartX + (chartWidth - markSize - gap - wordWidth) / 2;
  const y = chartY + (chartHeight - markSize) / 2;

  ctx.save();
  ctx.globalAlpha = CHART_MARK_EXPORT_OPACITY;
  ctx.drawImage(mark, x, y, markSize, markSize);
  ctx.fillStyle = color;
  ctx.fillText(CHART_MARK_WORD, x + markSize + gap, y + markSize / 2);
  ctx.restore();
}

function cardSurface(source: HTMLElement): HTMLElement {
  return (
    source.closest("[data-slot=card-content]") ??
    source.closest("[data-slot=card]") ??
    source
  );
}

function cssForeground(source: HTMLElement): string {
  return getComputedStyle(cardSurface(source)).color.trim();
}

function cssOpaqueBackground(source: HTMLElement): string {
  let el: HTMLElement | null = cardSurface(source);

  while (el) {
    const value = getComputedStyle(el).backgroundColor.trim();
    if (!TRANSPARENT_BACKGROUNDS.has(value)) {
      return value;
    }
    el = el.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor;
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

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load chart mark"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  return image;
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

  const pixelRatio = exportScale(canvas);
  const frame = exportFrame(canvas.width, canvas.height, pixelRatio);
  const output = document.createElement("canvas");
  output.width = frame.width;
  output.height = frame.height;
  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create chart export");
  }

  const background = cssOpaqueBackground(source);
  const foreground = cssForeground(source);
  const radius = CHART_DOWNLOAD_RADIUS * pixelRatio;
  const markPromise = loadSvgImage(notraMarkSvg(foreground));

  ctx.fillStyle = background;
  roundRect(ctx, 0, 0, frame.width, frame.height, radius);
  ctx.fill();

  ctx.drawImage(canvas, frame.chartX, frame.chartY);

  const mark = await markPromise;
  paintExportLockup(
    ctx,
    mark,
    foreground,
    frame.chartWidth,
    frame.chartHeight,
    frame.chartX,
    frame.chartY
  );

  ctx.fillStyle = foreground;
  ctx.font = `600 ${CHART_DOWNLOAD_TITLE_SIZE * pixelRatio}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(title, frame.padding, frame.padding);

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
