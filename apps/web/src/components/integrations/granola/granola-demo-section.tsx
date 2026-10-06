import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GranolaDraftCard } from "@/components/integrations/granola/granola-draft-card";
import { GranolaNoteCard } from "@/components/integrations/granola/granola-note-card";

export function GranolaDemoSection() {
  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <GranolaNoteCard />
      <HugeiconsIcon
        className="text-primary shrink-0 rotate-90 lg:rotate-0"
        icon={ArrowRight02Icon}
        size={28}
        strokeWidth={2.2}
      />
      <GranolaDraftCard />
    </div>
  );
}
