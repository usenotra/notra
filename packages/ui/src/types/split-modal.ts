import type { DialogContent } from "@notra/ui/components/ui/dialog";
import type { ComponentProps } from "react";

export type SplitModalContentProps = ComponentProps<typeof DialogContent> & {
  /** Render through `ResponsiveDialogContent` so it becomes a drawer on mobile. */
  responsive?: boolean;
};

export type SplitModalPaneProps = ComponentProps<"section">;
