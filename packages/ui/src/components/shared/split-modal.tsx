import { ResponsiveDialogContent } from "@notra/ui/components/shared/responsive-dialog";
import { DialogContent } from "@notra/ui/components/ui/dialog";
import { cn } from "@notra/ui/lib/utils";
import type {
  SplitModalContentProps,
  SplitModalPaneProps,
} from "@notra/ui/types/split-modal";

export function SplitModalContent({
  className,
  responsive = false,
  ...props
}: SplitModalContentProps) {
  const Content = responsive ? ResponsiveDialogContent : DialogContent;
  return (
    <Content
      className={cn(
        "md:border-shell-border md:bg-shell flex min-w-0 flex-col gap-0 overflow-hidden p-0 md:flex-row md:rounded-3xl md:border md:p-0.5 md:ring-0",
        className
      )}
      showCloseButton={false}
      {...props}
    />
  );
}

export function SplitModalPane({
  className,
  ...props
}: SplitModalPaneProps) {
  return (
    <section
      className={cn(
        "md:border-border md:bg-card md:shadow-lift flex min-h-0 min-w-0 flex-1 flex-col md:rounded-[21px] md:border",
        className
      )}
      {...props}
    />
  );
}
