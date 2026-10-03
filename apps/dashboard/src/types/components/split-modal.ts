import type { DialogContent } from "@notra/ui/components/ui/dialog";
import type { ComponentProps } from "react";

export type SplitModalContentProps = ComponentProps<typeof DialogContent> & {
  responsive?: boolean;
};
