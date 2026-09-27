import { toast } from "sonner";

import { commonToastMessage } from "@/utils/toast-message";

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success(commonToastMessage("copied"));
}

export async function copyTextToClipboard(
  text: string,
  successMessage: string
): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    toast.error(commonToastMessage("clipboardUnsupported"));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    toast.error(commonToastMessage("copyFailed"));
    return;
  }
  toast.success(successMessage);
}
