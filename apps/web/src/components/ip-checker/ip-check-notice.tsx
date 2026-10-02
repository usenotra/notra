import { Alert02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { m, useReducedMotion } from "motion/react";

import { IP_CHECKER_MOTION } from "@/constants/ip-checker";
import type { IpCheckNoticeProps } from "@/types/ip-checker";

export function IpCheckNotice({ message, status }: IpCheckNoticeProps) {
  const reduceMotion = useReducedMotion();
  const icon = status === "rate-limited" ? Clock01Icon : Alert02Icon;
  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: IP_CHECKER_MOTION.enter },
        exit: { opacity: 0, transition: IP_CHECKER_MOTION.exit },
      };

  return (
    <m.div
      aria-live="polite"
      className="flex items-center gap-3 rounded-2xl border border-[#1E1E1E14] bg-white px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]"
      role="status"
      {...motionProps}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F5FB] text-[#1E1E1E] dark:bg-white/[0.06] dark:text-white">
        <HugeiconsIcon className="size-4.5" icon={icon} />
      </span>
      <p className="font-sans text-[0.9375rem]/6 font-medium text-[#1E1E1E] dark:text-white">
        {message}
      </p>
    </m.div>
  );
}
