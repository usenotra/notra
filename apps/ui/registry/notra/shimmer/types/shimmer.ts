import type { ComponentProps } from "react";

export interface ShimmerProps extends ComponentProps<"span"> {
  duration?: number;
  spread?: number;
}
