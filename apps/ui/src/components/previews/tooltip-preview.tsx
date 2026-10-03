import { BoldIcon, ItalicIcon, LinkIcon, UnderlineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { tooltipContentClassName } from "@/components/ui/tooltip";

export default function TooltipPreview() {
  return (
    <div className="flex flex-col items-center gap-2 self-center pb-6">
      <div
        className={`${tooltipContentClassName} -translate-x-5`}
        data-slot="tooltip-content"
      >
        Italic
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>I</Kbd>
        </KbdGroup>
      </div>
      <div
        aria-hidden
        className="border-border bg-background flex items-center gap-0.5 rounded-xl border p-1 shadow-xs"
      >
        <Button aria-label="Bold" size="icon-sm" tabIndex={-1} variant="ghost">
          <BoldIcon />
        </Button>
        <Button
          aria-label="Italic"
          className="bg-muted"
          size="icon-sm"
          tabIndex={-1}
          variant="ghost"
        >
          <ItalicIcon />
        </Button>
        <Button
          aria-label="Underline"
          size="icon-sm"
          tabIndex={-1}
          variant="ghost"
        >
          <UnderlineIcon />
        </Button>
        <Button
          aria-label="Add link"
          size="icon-sm"
          tabIndex={-1}
          variant="ghost"
        >
          <LinkIcon />
        </Button>
      </div>
    </div>
  );
}
