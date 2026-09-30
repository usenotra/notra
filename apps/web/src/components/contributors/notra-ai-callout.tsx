import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github } from "@notra/ui/components/ui/svgs/github";
import Link from "next/link";
import type { NotraAiCalloutProps } from "~types/contributors";

import { NotraMark } from "@/components/notra-mark";
import {
  NOTRA_AI_CALLOUT_BODY,
  NOTRA_AI_CALLOUT_BODY_SUFFIX,
  NOTRA_AI_CALLOUT_CTA,
  NOTRA_AI_CALLOUT_TITLE,
} from "@/constants/contributors";
import { formatNotraAiPrCountLabel } from "@/utils/github";
import { DOCS_URL } from "@/utils/urls";

const GITHUB_APP_DOCS_URL = `${DOCS_URL}/integrations/github`;

export function NotraAiCallout({ prCount }: NotraAiCalloutProps) {
  if (prCount === 0) {
    return null;
  }
  return (
    <div className="flex w-full max-w-320 flex-col items-start justify-between gap-5 rounded-[1.25rem] bg-[#C8B2EE40] p-6 sm:flex-row sm:items-center sm:p-8 dark:bg-[#231d3a]">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 items-center -space-x-2">
          <span className="flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-[#ECECEC] dark:bg-[#F6F3F1] dark:shadow-sm dark:inset-shadow-sm dark:shadow-black/40 dark:ring-white/10 dark:inset-shadow-white/8">
            <NotraMark className="size-7 shrink-0" />
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-[#ECECEC] dark:bg-[#1E1E1E] dark:ring-white/10">
            <Github className="size-6 shrink-0" />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-[1.375rem]/7 font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
            {NOTRA_AI_CALLOUT_TITLE}
          </h3>
          <p className="max-w-[32rem] font-sans text-[0.9375rem] leading-[1.5] text-[#1E1E1EBF] dark:text-white/70">
            {NOTRA_AI_CALLOUT_BODY}{" "}
            <strong className="font-semibold text-[#1E1E1E] dark:text-white">
              {formatNotraAiPrCountLabel(prCount)}
            </strong>{" "}
            {NOTRA_AI_CALLOUT_BODY_SUFFIX}
          </p>
        </div>
      </div>
      <Link
        className="cta-gradient-primary-flat flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-5.5 py-2.75 font-sans text-[0.875rem] leading-[1.29] font-semibold text-white"
        href={GITHUB_APP_DOCS_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        {NOTRA_AI_CALLOUT_CTA}
        <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
      </Link>
    </div>
  );
}
