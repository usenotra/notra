"use client";

import { ClaudeChatSpinner } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-spinner";
import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

const CLAUDE_CHAT_VERBS = [
  "Entwirren",
  "Nachdenken",
  "Sammeln",
  "Ordnen",
  "Weben",
] as const;

export function ClaudeChatThinking({
  className,
  reducedMotion = false,
  verbs = CLAUDE_CHAT_VERBS,
}: {
  className?: string;
  reducedMotion?: boolean;
  verbs?: readonly string[];
}) {
  const [verbIndex, setVerbIndex] = useState(0);
  const verb = verbs[verbIndex] ?? verbs[0] ?? "Entwirren";

  useEffect(() => {
    if (reducedMotion || verbs.length <= 1) {
      return;
    }

    const id = window.setInterval(() => {
      setVerbIndex((current) => (current + 1) % verbs.length);
    }, 2200);

    return () => {
      window.clearInterval(id);
    };
  }, [reducedMotion, verbs]);

  return (
    <div
      className={cn("flex items-center gap-2.5 text-[#8a8680]", className)}
    >
      <ClaudeChatSpinner
        animated
        reducedMotion={reducedMotion}
        size={22}
      />
      <span className="font-serif text-[16px] leading-none tracking-[-0.01em]">
        {verb}
      </span>
    </div>
  );
}
