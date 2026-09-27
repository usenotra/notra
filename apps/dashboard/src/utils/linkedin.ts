import { toast } from "sonner";

import type { LinkedInPostAuthor } from "@/types/content/linkedin-post";
import type { ConnectedAccount } from "@/types/hooks/connected-accounts";
import { commonToastMessage } from "@/utils/toast-message";

const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";

export function linkedInAuthorFromAccount(
  account: ConnectedAccount
): LinkedInPostAuthor {
  return {
    name: account.displayName,
    avatar: account.profileImageUrl ?? undefined,
  };
}

export function createLinkedInPostUrl(text?: string): string {
  const url = new URL(LINKEDIN_FEED_URL);
  url.searchParams.set("shareActive", "true");
  if (text) {
    url.searchParams.set("text", text);
  }

  return url.toString();
}

export async function copyLinkedInPostToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function copyLinkedInPostForPublishing(text: string) {
  copyLinkedInPostToClipboard(text).then((copied) => {
    if (copied) {
      toast.success(commonToastMessage("linkedinPostCopied"));
      return;
    }

    toast.error(commonToastMessage("linkedinPostCopyFailed"));
  });
}
