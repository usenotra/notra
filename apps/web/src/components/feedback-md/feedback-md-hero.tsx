import { FeedbackMdCommandTabs } from "@/components/feedback-md/feedback-md-command-tabs";
import { HeroDither } from "@/components/landing/hero-dither";
import { FEEDBACK_MD_HERO_LEAD } from "@/lib/feedback-md/constants";

export function FeedbackMdHero() {
  return (
    <section className="w-full px-6 pt-2 antialiased [font-synthesis:none] sm:pt-6">
      <div className="relative isolate overflow-clip rounded-3xl bg-[#EFEAFA] dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>

        <div className="relative flex w-full flex-col items-center gap-10 px-6 pt-20 pb-20 lg:pt-24">
          <div className="flex flex-col items-center gap-6">
            <h1 className="font-display max-w-[51.25rem] text-center text-[2.5rem] leading-[1.12] font-medium tracking-[-0.015em] text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] dark:text-white">
              Are you talking to their{" "}
              <span className="text-primary">agents</span>?
            </h1>
            <p className="max-w-[38.75rem] text-center font-sans text-[1.0625rem] leading-[1.42] font-medium tracking-[-0.005em] text-[#1E1E1EBF] sm:text-[1.1875rem] dark:text-white/70">
              {FEEDBACK_MD_HERO_LEAD}
            </p>
          </div>
          <FeedbackMdCommandTabs className="max-w-[45rem]" />
        </div>
      </div>
    </section>
  );
}
