import type { RefObject } from "react";

export interface ScrollOverflow<T extends HTMLElement> {
  ref: RefObject<T | null>;
  atEnd: boolean;
}
