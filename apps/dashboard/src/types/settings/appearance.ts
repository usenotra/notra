import type { APPEARANCE_OPTIONS } from "@/constants/appearance";

export type AppearanceMode = (typeof APPEARANCE_OPTIONS)[number]["value"];

export interface AppearancePreviewProps {
  mode: AppearanceMode;
}
