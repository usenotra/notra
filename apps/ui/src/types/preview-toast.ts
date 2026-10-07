import type { PREVIEW_TOAST_MESSAGE } from "../constants/preview-toast";

export interface PreviewToastMessage {
  description?: string;
  title: string;
  type: typeof PREVIEW_TOAST_MESSAGE;
}
