import { toast } from "sonner";

export async function copyToClipboard(
  text: string,
  successMessage: string
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error("Failed to copy to clipboard");
    return false;
  }
}
