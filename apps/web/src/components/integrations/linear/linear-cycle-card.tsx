import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Linear } from "@notra/ui/components/ui/svgs/linear";

import {
  LINEAR_CYCLE_DONE_LABEL,
  LINEAR_CYCLE_NAME,
  LINEAR_ISSUES,
} from "@/constants/linear-integration";

export function LinearCycleCard() {
  return (
    <div className="flex w-full grow basis-0 flex-col overflow-clip rounded-[1.25rem] bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] lg:w-auto dark:bg-[#17131F] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div className="flex items-center gap-2 px-5 py-3.5 [box-shadow:#F0F0F0_0_-0.0625rem_0_inset] dark:[box-shadow:#FFFFFF14_0_-0.0625rem_0_inset]">
        <Linear className="size-4 shrink-0" />
        <span className="font-sans text-sm leading-[1.125rem] font-semibold text-[#1E1E1E] dark:text-white">
          {LINEAR_CYCLE_NAME}
        </span>
        <span className="font-sans text-xs leading-4 text-[#1E1E1E66] dark:text-white/40">
          {LINEAR_CYCLE_DONE_LABEL}
        </span>
      </div>
      <div className="flex flex-col">
        {LINEAR_ISSUES.map((issue) => (
          <div
            className="flex items-center gap-3 px-5 py-3 [box-shadow:#F5F5F5_0_-0.0625rem_0_inset] last:shadow-none dark:[box-shadow:#FFFFFF0D_0_-0.0625rem_0_inset]"
            key={issue.identifier}
          >
            <span className="w-15 shrink-0 font-mono text-xs leading-4 text-[#1E1E1E80] dark:text-white/50">
              {issue.identifier}
            </span>
            <HugeiconsIcon
              className="shrink-0 text-[#5E6AD2] dark:text-[#8B93E8]"
              icon={CheckmarkCircle02Icon}
              size={16}
            />
            <span className="min-w-0 grow truncate font-sans text-[0.8125rem] leading-[1.125rem] font-medium text-[#1E1E1E] dark:text-white">
              {issue.title}
            </span>
            <span className="hidden shrink-0 rounded-full px-2 py-0.5 font-sans text-[0.6875rem] leading-4 font-medium text-[#1E1E1EA6] [box-shadow:#E5E5E5_0_0_0_0.0625rem] sm:inline dark:text-white/60 dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
              {issue.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
