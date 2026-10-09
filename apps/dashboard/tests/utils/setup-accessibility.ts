import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import type { SetupControlProps } from "../types/setup-accessibility";

export function setupControls(node: ReactNode, tag: string) {
  const controls: ReactElement<SetupControlProps>[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement<SetupControlProps>(child)) {
      return;
    }
    if (child.type === tag) {
      controls.push(child);
    }
    controls.push(...setupControls(child.props.children, tag));
  });
  return controls;
}
