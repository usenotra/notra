import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

import { FeedbackMdFilePreview } from "@/components/feedback-md/feedback-md-file-preview";
import {
  FEEDBACK_MD_EXAMPLE_DISCLAIMER,
  FEEDBACK_MD_SECTIONS,
  FEEDBACK_MD_TEMPLATE,
} from "@/lib/feedback-md/constants";
import { feedbackMdHeadingId } from "@/lib/feedback-md/lines";

const READING_LINE_RATIO = 0.39;

function headingTop(heading: string): number | null {
  const element = document.getElementById(feedbackMdHeadingId(heading));
  return element ? element.getBoundingClientRect().top : null;
}

function headingAtReadingLine(): string | null {
  const line = window.innerHeight * READING_LINE_RATIO;
  let current: string | null = null;
  for (const section of FEEDBACK_MD_SECTIONS) {
    const top = headingTop(section.heading);
    if (top !== null && top <= line) {
      current = section.heading;
    }
  }
  return current ?? FEEDBACK_MD_SECTIONS[0]?.heading ?? null;
}

export function FeedbackMdAnatomy() {
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setActiveHeading(headingAtReadingLine());
    };
    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  function scrollToHeading(heading: string) {
    const top = headingTop(heading);
    if (top === null) {
      return;
    }
    setActiveHeading(heading);
    window.scrollBy({
      top: top - window.innerHeight * READING_LINE_RATIO + 1,
      behavior: "smooth",
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
      <div className="flex flex-col gap-3">
        <FeedbackMdFilePreview
          activeHeading={activeHeading}
          filename="usefall.com/feedback.md"
          source={FEEDBACK_MD_TEMPLATE}
        />
        <p className="font-sans text-xs leading-5 text-[#1E1E1E80] dark:text-white/40">
          {FEEDBACK_MD_EXAMPLE_DISCLAIMER}
        </p>
      </div>
      <ol className="flex flex-col gap-5 lg:sticky lg:top-32 lg:self-start lg:pt-2">
        {FEEDBACK_MD_SECTIONS.map((section) => {
          const active = activeHeading === section.heading;
          return (
            <li
              className={cn(
                "duration-slow border-l-2 pl-4 transition-colors",
                active
                  ? "border-[#8B5CF6] dark:border-[#C8B2EE]"
                  : "border-[#1E1E1E1F] dark:border-white/10"
              )}
              key={section.heading}
            >
              <button
                className="flex w-full cursor-pointer flex-col gap-1.5 text-left"
                onClick={() => scrollToHeading(section.heading)}
                type="button"
              >
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "duration-slow font-mono text-[0.8125rem] font-medium transition-colors",
                      active
                        ? "text-[#1E1E1E] dark:text-white"
                        : "text-[#1E1E1E99] dark:text-white/50"
                    )}
                  >
                    ## {section.heading}
                  </span>
                  <span className="font-sans text-xs text-[#1E1E1E80] dark:text-white/50">
                    {section.required ? "required" : "optional"}
                  </span>
                </span>
                <span
                  className={cn(
                    "duration-slow font-sans text-[0.8125rem] leading-[1.5] transition-colors",
                    active
                      ? "text-[#1E1E1EA6] dark:text-white/60"
                      : "text-[#1E1E1E66] dark:text-white/35"
                  )}
                >
                  {section.description}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
