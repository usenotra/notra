import type { ReactNode } from "react";

export type HtmlExportTarget = "figma" | "paper";

export type HtmlExportResult = {
  copied: boolean;
  error?: string;
};

export type HtmlCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export type HtmlExportToolProps = {
  target: HtmlExportTarget;
};

export type HtmlPreviewProps = {
  html: string;
};

export type HtmlExportShellProps = {
  target: HtmlExportTarget;
  title: ReactNode;
  subtitle: string;
};
