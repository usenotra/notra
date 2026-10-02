import type { ComponentProps } from "react";

export interface NextImageShimProps extends ComponentProps<"img"> {
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  quality?: number;
}
