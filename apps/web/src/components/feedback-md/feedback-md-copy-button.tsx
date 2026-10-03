import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";

import type { FeedbackMdCopyButtonProps } from "@/types/feedback-md";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

export function FeedbackMdCopyButton({
  text,
  successMessage,
  children,
}: FeedbackMdCopyButtonProps) {
  return (
    <Button
      className="bg-white/10 text-white hover:bg-white/15 dark:bg-white/10 dark:hover:bg-white/15"
      onClick={() => copyToClipboard(text, successMessage)}
      size="sm"
      variant="secondary"
    >
      <HugeiconsIcon icon={Copy01Icon} />
      {children}
    </Button>
  );
}
