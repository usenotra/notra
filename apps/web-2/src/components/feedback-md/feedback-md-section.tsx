import type { FeedbackMdSectionProps } from "@/types/feedback-md";

export function FeedbackMdSection({
  title,
  description,
  children,
}: FeedbackMdSectionProps) {
  return (
    <section className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-[1.75rem] leading-[1.21] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
          {title}
        </h2>
        <p className="max-w-[42rem] font-sans text-[0.9375rem] leading-[1.5] text-[#1E1E1EA6] dark:text-white/60">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
