import { PREVIEW_TOAST_MESSAGE } from "../constants/preview-toast";
import type { PreviewToastMessage } from "../types/preview-toast";

export const isPreviewToastMessage = (
  data: unknown
): data is PreviewToastMessage =>
  typeof data === "object" &&
  data !== null &&
  "type" in data &&
  data.type === PREVIEW_TOAST_MESSAGE &&
  "title" in data &&
  typeof data.title === "string";

export const subscribeToTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
    attributes: true,
  });
  return () => observer.disconnect();
};

export const getTheme = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const getServerTheme = () => "light" as const;
