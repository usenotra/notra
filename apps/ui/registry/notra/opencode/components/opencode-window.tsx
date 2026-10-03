import { cn } from "cn";

import { Card } from "@/components/ui/card";

import type { OpencodeWindowProps } from "../types/opencode";

export const OpencodeWindow = ({
  className,
  ...props
}: OpencodeWindowProps) => (
  <Card
    className={cn(
      "border-opencode-subtle bg-opencode-bg font-opencode text-opencode-fg flex w-full flex-col gap-0 overflow-hidden rounded-xl border py-0 text-[0.8125rem] leading-5 antialiased ring-0",
      className
    )}
    data-slot="opencode-window"
    {...props}
  />
);
