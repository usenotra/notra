import type { RefObject } from "react";

export interface ChartDownloadRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartDownloadFrame {
  width: number;
  height: number;
  padding: number;
  header: number;
  chartX: number;
  chartY: number;
  chartWidth: number;
  chartHeight: number;
}

export interface DownloadChartPngOptions {
  source: HTMLElement;
  title: string;
  filename: string;
}

export interface ChartDownloadButtonProps {
  sourceRef: RefObject<HTMLElement | null>;
  title?: string;
  filename?: string;
  className?: string;
}
