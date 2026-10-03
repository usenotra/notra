import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";

import { FEEDBACK_MD_QUESTIONS } from "@/lib/feedback-md/constants";
import type { FeedbackMdFaqRowProps } from "@/types/feedback-md";

function FaqToggleIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.992 12H3.992"
        fill="none"
        stroke="#8B5CF6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        className={cn(
          "duration-slow origin-center transition-transform ease-out motion-reduce:transition-none",
          open ? "scale-y-0" : "scale-y-100"
        )}
        d="M11.992 4V20"
        fill="none"
        stroke="#8B5CF6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function FeedbackMdFaqRow({ item, open, onToggle }: FeedbackMdFaqRowProps) {
  const panelId = `feedback-md-faq-panel-${item.id}`;
  const triggerId = `feedback-md-faq-trigger-${item.id}`;

  return (
    <div className="flex flex-col border-t border-[#1E1E1E1F] py-6 dark:border-white/10">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-4 text-left sm:gap-6"
        id={triggerId}
        onClick={onToggle}
        type="button"
      >
        <span className="flex shrink-0 items-center justify-center">
          <FaqToggleIcon open={open} />
        </span>
        <span className="grow font-sans text-lg leading-7 font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
          {item.question}
        </span>
      </button>
      <div
        className={cn(
          "duration-slow grid transition-[grid-template-rows] ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        id={panelId}
      >
        <div className="overflow-hidden">
          <p className="pt-3.5 pl-10 font-sans text-base leading-6 tracking-[-0.01em] text-[#1E1E1E99] sm:pl-12 dark:text-white/60">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeedbackMdFaq() {
  const [openId, setOpenId] = useState<string | null>(
    FEEDBACK_MD_QUESTIONS[0]?.id ?? null
  );

  return (
    <div className="flex w-full flex-col border-b border-[#1E1E1E1F] dark:border-white/10">
      {FEEDBACK_MD_QUESTIONS.map((item) => (
        <FeedbackMdFaqRow
          item={item}
          key={item.id}
          onToggle={() =>
            setOpenId((current) => (current === item.id ? null : item.id))
          }
          open={openId === item.id}
        />
      ))}
    </div>
  );
}
