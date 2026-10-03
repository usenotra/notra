import type { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { ReactNode } from "react";

export interface StepSliderProps extends Omit<
  SliderPrimitive.Root.Props<number>,
  | "children"
  | "defaultValue"
  | "form"
  | "format"
  | "largeStep"
  | "max"
  | "min"
  | "name"
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
  /** Fires when a drag, key press or label click ends. */
  onValueCommitted?: (value: number) => void;
  /** Label under each stop. Defaults to the number itself. */
  formatLabel?: (value: number) => ReactNode;
  /** Steps whose label stays visible in a narrow container. All labels show when omitted. */
  majorSteps?: readonly number[];
  /** Hides the labels under the track. */
  hideLabels?: boolean;
  /**
   * Fractional step index for a value, to place values between stops on the
   * track, e.g. `2.5` sits halfway between the third and fourth stop. Snaps to
   * the nearest stop when omitted.
   */
  positionOf?: (value: number) => number;
  /** Submits the selected step value (not its index) under this name. */
  name?: string;
  /** Id of the form the value belongs to, when the slider sits outside it. */
  form?: string;
  /** Accessible name of the thumb. */
  "aria-label"?: string;
  /** Screen reader text for a value, e.g. `"10 prompts"`. */
  getValueText?: (value: number) => string;
}
