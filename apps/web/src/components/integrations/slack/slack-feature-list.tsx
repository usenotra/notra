import { SLACK_FEATURES } from "@/constants/slack-integration";

export function SlackFeatureList() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {SLACK_FEATURES.map((feature) => (
        <div className="flex flex-col gap-2" key={feature.title}>
          <h2 className="font-sans text-lg leading-[1.4375rem] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
            {feature.title}
          </h2>
          <p className="font-sans text-sm leading-[1.3125rem] text-[#1E1E1EBF] dark:text-white/75">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
