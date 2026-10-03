import { cn } from "cn";

import { Shimmer } from "../../shimmer/components/shimmer";
import type { ChatgptThinkingProps } from "../types/chatgpt";

export const ChatgptThinking = ({
  className,
  label = "Thinking",
  ...props
}: ChatgptThinkingProps) => (
  <div
    aria-live="polite"
    className={cn(
      "font-chatgpt text-chatgpt-muted text-base leading-7 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none starting:opacity-0",
      className
    )}
    data-slot="chatgpt-thinking"
    role="status"
    {...props}
  >
    <Shimmer className="font-medium [--shimmer-highlight:var(--chatgpt-fg)]">
      {label}
    </Shimmer>
  </div>
);
