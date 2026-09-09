import type { ReactNode } from "react";

export interface BrandColor {
  name: string;
  hex: string;
  value: string;
  usage: string;
}

export interface BrandFont {
  name: string;
  fontClassName: string;
  role: string;
  googleFontsUrl: string;
  source: string;
}

export interface BrandColorSwatchProps {
  color: BrandColor;
}

interface BrandAssetFile {
  svg: string;
  png: string;
}

export interface BrandAssetPaths {
  mark: BrandAssetFile;
  wordmark: BrandAssetFile;
  wordmarkDark: BrandAssetFile;
  zip: string;
}

export interface BrandAssetCardProps {
  variant: "light" | "dark";
  asset: BrandAssetFile;
  downloadName: string;
  copyLabel: string;
  children: ReactNode;
}
