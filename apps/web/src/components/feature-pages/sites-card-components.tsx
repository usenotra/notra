import {
  ArrowDown01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";

import {
  SITES_COMPONENT_ACCORDIONS,
  SITES_COMPONENT_INSTALL,
  SITES_COMPONENT_NOTE,
  SITES_COMPONENT_STEPS,
  SITES_COMPONENT_TABS,
  SITES_COMPONENT_TITLE,
  SITES_MOCK_SURFACE_CLASS,
} from "@/constants/feature-pages/sites";

export function SitesCardComponents() {
  return (
    <div
      aria-hidden="true"
      className={cn(SITES_MOCK_SURFACE_CLASS, "flex flex-col gap-4 p-5")}
    >
      <div className="flex items-center gap-2">
        <span className="text-foreground text-base font-semibold">
          {SITES_COMPONENT_TITLE}
        </span>
        <span className="rounded-md bg-[#EAF6EE] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[#2F7D4B] dark:bg-[#4FAE73]/15 dark:text-[#6FCF8F]">
          New
        </span>
      </div>

      <div className="overflow-clip rounded-xl border">
        <div className="bg-muted/50 flex gap-4 border-b px-3.5">
          {SITES_COMPONENT_TABS.map((tab, index) => (
            <span
              className={cn(
                "-mb-px border-b-2 py-2 text-xs font-medium",
                index === 0
                  ? "text-foreground border-[#8B5CF6]"
                  : "text-muted-foreground border-transparent"
              )}
              key={tab}
            >
              {tab}
            </span>
          ))}
        </div>
        <pre className="px-3.5 py-3 font-mono text-[0.8125rem]">
          <span className="text-[#8B5CF6]">$</span>{" "}
          <span className="text-foreground">{SITES_COMPONENT_INSTALL}</span>
        </pre>
      </div>

      <div className="flex gap-2.5 rounded-xl border border-[#C9DDF7] bg-[#F1F7FE] px-3.5 py-3 dark:border-[#4493F8]/30 dark:bg-[#4493F8]/10">
        <HugeiconsIcon
          className="mt-0.5 size-4 shrink-0 text-[#2F6FD0] dark:text-[#79B8FF]"
          icon={InformationCircleIcon}
        />
        <span className="text-[0.8125rem]/5 text-[#1F4E8F] dark:text-[#B6D5FB]">
          {SITES_COMPONENT_NOTE}
        </span>
      </div>

      <ol className="flex flex-col gap-0">
        {SITES_COMPONENT_STEPS.map((step, index) => (
          <li className="flex gap-3" key={step}>
            <span className="flex flex-col items-center">
              <span className="bg-muted text-foreground flex size-5.5 items-center justify-center rounded-full text-[0.6875rem] font-semibold">
                {index + 1}
              </span>
              {index === 0 ? <span className="bg-border w-px flex-1" /> : null}
            </span>
            <span
              className={cn(
                "text-foreground text-[0.8125rem]/5.5 font-medium",
                index === 0 && "pb-3"
              )}
            >
              {step}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col rounded-xl border">
        {SITES_COMPONENT_ACCORDIONS.map((question) => (
          <span
            className="text-foreground flex items-center justify-between border-b px-3.5 py-2.5 text-[0.8125rem] font-medium last:border-b-0"
            key={question}
          >
            {question}
            <HugeiconsIcon
              className="text-muted-foreground size-4"
              icon={ArrowDown01Icon}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
