import { useFlag } from "@databuddy/sdk/react";

import { LANDING_TESTIMONIALS_FLAG_KEY } from "@/constants/landing/testimonials";
import type { TestimonialsGateProps } from "@/types/landing/testimonials";

export function TestimonialsGate({ children }: TestimonialsGateProps) {
  const flag = useFlag(LANDING_TESTIMONIALS_FLAG_KEY);
  if (!flag.on) {
    return null;
  }
  return <>{children}</>;
}
