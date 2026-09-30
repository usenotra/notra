import type { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { ReactNode } from "react";

export interface StepSliderProps extends Omit<
  SliderPrimitive.Root.Props<number>,
  | "children"
  | "defaultValue"
  | "largeStep"
  | "max"
  | "min"
  | "onValueChange"
  | "onValueCommitted"
  | "orientation"
  | "step"
  | "thumbAlignment"
  | "value"
> {
  /** The values the slider snaps to, in ascending order. */
  steps: readonly number[];
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Fires when a drag or key press ends. */
  onValueCommitted?: (value: number) => void;
  /** Label under each stop. Defaults to the number itself. */
  formatLabel?: (value: number) => ReactNode;
  /** Steps whose label stays visible in a narrow container. All labels show when omitted. */
  majorSteps?: readonly number[];
  /** Hides the labels under the track. */
  hideLabels?: boolean;
  /** Accessible name of the thumb. */
  "aria-label"?: string;
  /** Screen reader text for a value, e.g. `"10 prompts"`. */
  getValueText?: (value: number) => string;
}
