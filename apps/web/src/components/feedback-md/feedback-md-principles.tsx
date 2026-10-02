import { FEEDBACK_MD_PRINCIPLES } from "@/lib/feedback-md/constants";

export function FeedbackMdPrinciples() {
  return (
    <dl className="grid gap-8 md:grid-cols-3 md:gap-6">
      {FEEDBACK_MD_PRINCIPLES.map((principle) => (
        <div className="flex flex-col gap-1.5" key={principle.title}>
          <dt className="font-sans text-[0.9375rem] leading-[1.36] font-medium text-[#1E1E1E] dark:text-white">
            {principle.title}
          </dt>
          <dd className="font-sans text-[0.875rem] leading-[1.5] text-[#1E1E1EA6] dark:text-white/60">
            {principle.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}
