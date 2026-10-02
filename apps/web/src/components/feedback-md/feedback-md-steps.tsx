import { FeedbackMdCopyButton } from "@/components/feedback-md/feedback-md-copy-button";
import { FEEDBACK_MD_SETUP_PROMPT } from "@/lib/feedback-md/constants";

export function FeedbackMdSteps() {
  return (
    <div className="flex w-full flex-col overflow-clip rounded-[1.25rem] bg-[#1E1E1E] [box-shadow:#28282833_0rem_1.5rem_3.5rem_-1rem]">
      <div className="flex items-center justify-between gap-3 bg-[#282828] px-4.5 py-2.5">
        <span className="font-mono text-[0.75rem] leading-4 text-[#FFFFFF66]">
          prompt
        </span>
        <FeedbackMdCopyButton
          successMessage="Copied prompt"
          text={FEEDBACK_MD_SETUP_PROMPT}
        >
          Copy
        </FeedbackMdCopyButton>
      </div>
      <p className="p-5 font-mono text-[0.8125rem] leading-6 text-white/80 sm:p-6">
        {FEEDBACK_MD_SETUP_PROMPT}
      </p>
    </div>
  );
}
