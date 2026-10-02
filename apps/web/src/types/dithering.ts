import type { DitheringProps } from "@paper-design/shaders-react";
import type { PointerEvent, RefObject } from "react";

export type DitheringCanvasProps = Pick<
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
  | "offsetX"
  | "offsetY"
> & {
  className?: string;
  animate?: boolean;
  onPainted?: () => void;
};

export type DeferredDitheringProps = Omit<DitheringCanvasProps, "animate"> & {
  unmountOffscreen?: boolean;
  eager?: boolean;
};

export interface HeroDitherProps {
  eager?: boolean;
}

export interface DitherVisibilityState {
  containerRef: RefObject<HTMLDivElement | null>;
  shouldRender: boolean;
  isAnimating: boolean;
}

export interface DitherPointerOffset {
  offsetX: number;
  offsetY: number;
}

export interface DitherPointerOptions {
  restSpeed: number;
  hoverSpeed?: number;
  offsetRange: number;
  lerp: number;
  visibleYRatio?: number;
}

interface DitherPointerHandlers {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

interface DitherPointerState extends DitherPointerOffset {
  speed: number;
  isHovering: boolean;
}

export interface DitherPointerResult extends DitherPointerState {
  pointerProps: DitherPointerHandlers;
}
