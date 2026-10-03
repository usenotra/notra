import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
  UnderlineIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TOOLTIP_OPEN_DELAY_MS = 400;

const ACTIONS = [
  { icon: BoldIcon, keys: ["⌘", "B"], label: "Bold" },
  { icon: ItalicIcon, keys: ["⌘", "I"], label: "Italic" },
  { icon: UnderlineIcon, keys: ["⌘", "U"], label: "Underline" },
  { icon: LinkIcon, keys: ["⌘", "K"], label: "Add link" },
  { icon: ListIcon, keys: [], label: "Bulleted list" },
  { icon: QuoteIcon, keys: [], label: "Quote" },
  { icon: CodeIcon, keys: ["⌘", "E"], label: "Inline code" },
] as const;

export default function TooltipToolbarExample() {
  return (
    <div className="flex justify-center p-10">
      <TooltipProvider delay={TOOLTIP_OPEN_DELAY_MS}>
        <div
          aria-label="Formatting"
          className="border-border bg-background flex items-center gap-0.5 rounded-xl border p-1 shadow-xs"
          role="toolbar"
        >
          {ACTIONS.map(({ icon: Icon, keys, label }) => (
            <Tooltip key={label}>
              <TooltipTrigger
                render={
                  <Button aria-label={label} size="icon-sm" variant="ghost" />
                }
              >
                <Icon />
              </TooltipTrigger>
              <TooltipContent>
                {label}
                {keys.length > 0 ? (
                  <KbdGroup>
                    {keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </KbdGroup>
                ) : null}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
