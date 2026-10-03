import { useEffect, useRef } from "react";

import { OFFERING_SAMPLE_TYPE_MS } from "@/constants/offering-check";
import type { OfferingCheckInput } from "@/types/offering-check";
import { getReducedMotionSnapshot } from "@/utils/reduced-motion";

type ApplySample = (domain: string, feature: string) => void;

/** Types a sample into the form one character at a time, domain first. */
export function useSampleTyping(apply: ApplySample) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => stop, []);

  return (sample: OfferingCheckInput) => {
    stop();
    if (getReducedMotionSnapshot()) {
      apply(sample.domain, sample.feature);
      return;
    }
    const total = sample.domain.length + sample.feature.length;
    let typed = 0;
    apply("", "");
    timer.current = setInterval(() => {
      typed += 1;
      apply(
        sample.domain.slice(0, typed),
        sample.feature.slice(0, Math.max(0, typed - sample.domain.length))
      );
      if (typed >= total) {
        stop();
      }
    }, OFFERING_SAMPLE_TYPE_MS);
  };
}
