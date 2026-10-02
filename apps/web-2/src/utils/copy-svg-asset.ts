import { toast } from "sonner";

import { copyToClipboard } from "@/utils/copy-to-clipboard";

export async function copySvgAsset(
  path: string,
  successMessage: string
): Promise<boolean> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }
    const svg = await response.text();
    return await copyToClipboard(svg, successMessage);
  } catch {
    toast.error("Failed to load the SVG asset");
    return false;
  }
}
