"use client";

import type { PromptCopyButtonProps } from "@/types/geo-prompt-detail";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

export function PromptCopyButton({ prompt }: PromptCopyButtonProps) {
  return (
    <button
      aria-label={`Copy prompt: ${prompt}`}
      className="bg-background hover:bg-muted/50 focus-visible:ring-ring inline-flex max-w-full cursor-pointer items-center rounded-md border px-2 py-1 text-left wrap-anywhere shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
      onClick={() => copyTextToClipboard(prompt, "Copied prompt")}
      title="Copy prompt"
      type="button"
    >
      {prompt}
    </button>
  );
}
