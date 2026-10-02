import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { CONTACT_PURPOSE, CONTACT_RECIPIENT } from "@/constants/contact";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

const COPIED_RESET_MS = 2000;

export function ContactEmail() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const didCopy = await copyToClipboard(
      CONTACT_RECIPIENT,
      "Email address copied"
    );

    if (didCopy) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    }
  };

  return (
    <div className="dark:bg-primary/10 flex items-center justify-between gap-4 rounded-3xl bg-[#F1ECFB66] px-7 py-6">
      <div className="flex flex-col gap-1">
        <a
          className="font-display hover:text-primary text-[1.1875rem]/6 font-semibold tracking-[-0.015em] text-[#1E1E1E] transition-colors dark:text-white"
          href={`mailto:${CONTACT_RECIPIENT}`}
        >
          {CONTACT_RECIPIENT}
        </a>
        <p className="font-sans text-[0.8125rem]/4.75 text-[#1E1E1EA6] dark:text-white/60">
          {CONTACT_PURPOSE}
        </p>
      </div>
      <button
        aria-label="Copy email address"
        className="flex shrink-0 items-center gap-1.5 rounded-[2.5625rem] border border-[#ECECEC] bg-white px-4 py-2 shadow-[0_0.0625rem_0.125rem_#28282814] transition-colors hover:bg-[#F7F4FD] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.1]"
        onClick={handleCopy}
        type="button"
      >
        <HugeiconsIcon
          className="size-3.5 text-[#1E1E1E] dark:text-white"
          icon={copied ? Tick02Icon : Copy01Icon}
          strokeWidth={2}
        />
        <span className="font-display text-[0.8125rem]/4.25 font-medium text-[#1E1E1E] dark:text-white">
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
    </div>
  );
}
