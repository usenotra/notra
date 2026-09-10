import type { DitheringProps } from "@paper-design/shaders-react";
import type { RefObject } from "react";

export type DeferredDitheringProps = Pick<
  DitheringProps,
  | "colorBack"
  | "colorFront"
  | "scale"
  | "shape"
  | "size"
  | "speed"
  | "type"
  | "frame"
  | "fit"
  | "maxPixelCount"
> & {
  className?: string;
  unmountOffscreen?: boolean;
};

export interface DitherVisibilityState {
  containerRef: RefObject<HTMLDivElement | null>;
  shouldRender: boolean;
  isAnimating: boolean;
}
