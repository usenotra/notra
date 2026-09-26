import type { AnimateOptions } from "streamdown";

import { DURATION } from "@notra/ui/lib/motion";

export const MESSAGE_TEXT_ANIMATION = {
  animation: "blurIn",
  duration: DURATION.fast * 1000,
  easing: "ease-out",
  sep: "word",
  stagger: 0,
} satisfies AnimateOptions;
