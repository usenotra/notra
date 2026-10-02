import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import {
  FEEDBACK_MD_ADOPTERS,
  FEEDBACK_MD_ADOPTERS_CAPTION,
  FEEDBACK_MD_ADOPTERS_CTA_HREF,
  FEEDBACK_MD_ADOPTERS_CTA_LABEL,
} from "@/lib/feedback-md/constants";

export function FeedbackMdAdopters() {
  return (
    <section className="flex w-full flex-col items-center gap-8">
      <p className="font-mono text-[0.75rem] leading-4 tracking-[0.2em] text-[#1E1E1E80] uppercase dark:text-white/50">
        {FEEDBACK_MD_ADOPTERS_CAPTION}
      </p>
      <ul className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-8">
        {FEEDBACK_MD_ADOPTERS.map(({ name, label, feedbackUrl, Logo }) => (
          <li className="flex w-[13rem] items-center justify-center" key={name}>
            <Link
              className="flex h-12 items-center justify-center text-[#52525B] transition-colors hover:text-[#1E1E1E] dark:text-[#9CA3AF] dark:hover:text-white"
              to={feedbackUrl}
              rel="noopener"
              target="_blank"
            >
              <Logo aria-label={label} className="h-7 w-auto shrink-0" />
            </Link>
          </li>
        ))}
        <li className="flex w-[13rem] items-center justify-center">
          <Link
            className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-lg font-sans text-[0.875rem] text-[#1E1E1E99] transition-colors hover:text-[#1E1E1E] dark:text-white/60 dark:hover:text-white"
            to={FEEDBACK_MD_ADOPTERS_CTA_HREF}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full text-[#1E1E1E33] transition-colors group-hover:text-[#1E1E1E66] dark:text-white/20 dark:group-hover:text-white/40"
            >
              <rect
                fill="none"
                height="calc(100% - 1px)"
                rx="8"
                stroke="currentColor"
                strokeDasharray="5 7"
                strokeWidth="1"
                width="calc(100% - 1px)"
                x="0.5"
                y="0.5"
              />
            </svg>
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            {FEEDBACK_MD_ADOPTERS_CTA_LABEL}
          </Link>
        </li>
      </ul>
    </section>
  );
}
