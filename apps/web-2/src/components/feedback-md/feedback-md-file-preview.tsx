import { cn } from "@notra/ui/lib/utils";

import { FeedbackMdCopyButton } from "@/components/feedback-md/feedback-md-copy-button";
import {
  feedbackMdLineId,
  parseFeedbackMdLines,
} from "@/lib/feedback-md/lines";
import type {
  FeedbackMdFilePreviewProps,
  FeedbackMdLineKind,
} from "@/types/feedback-md";

const LINE_CLASSNAME: Record<FeedbackMdLineKind, string> = {
  title: "font-semibold text-white",
  heading: "pt-2 font-medium text-[#C8B2EE]",
  list: "text-white/80",
  text: "text-white/60",
  blank: "h-6",
};

export function FeedbackMdFilePreview({
  source,
  filename,
  activeHeading,
}: FeedbackMdFilePreviewProps) {
  const lines = parseFeedbackMdLines(source);

  return (
    <div className="flex w-full flex-col overflow-clip rounded-[1.25rem] bg-[#1E1E1E] [box-shadow:#28282833_0rem_1.5rem_3.5rem_-1rem]">
      <div className="flex items-center justify-between gap-3 bg-[#282828] px-4.5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 shrink-0 rounded-full bg-[#4A4A4A]" />
            <div className="size-2.5 shrink-0 rounded-full bg-[#4A4A4A]" />
            <div className="size-2.5 shrink-0 rounded-full bg-[#4A4A4A]" />
          </div>
          <span className="font-mono text-[0.75rem] leading-4 text-[#FFFFFF66]">
            {filename}
          </span>
        </div>
        <FeedbackMdCopyButton
          successMessage="Copied feedback.md template"
          text={source}
        >
          Copy
        </FeedbackMdCopyButton>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[0.8125rem] leading-6 whitespace-pre-wrap sm:p-6">
        {lines.map((line, index) => (
          <span
            className={cn(
              "duration-slow block scroll-mt-40 transition-opacity",
              LINE_CLASSNAME[line.kind],
              activeHeading !== null &&
                line.section !== null &&
                line.section !== activeHeading &&
                "opacity-40"
            )}
            id={feedbackMdLineId(line)}
            key={`${index}-${line.kind}`}
          >
            {line.text}
          </span>
        ))}
      </pre>
    </div>
  );
}
