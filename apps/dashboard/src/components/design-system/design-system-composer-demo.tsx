"use client";

import {
  AiBrain01Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  AtIcon,
  File02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Composer } from "@notra/ui/components/ui/composer";
import { useState } from "react";

import { ModelIcon } from "@/components/chat/chat-input";
import {
  COMPOSER_QUEUED_CHIP,
  COMPOSER_QUEUED_CHIP_LABEL,
} from "@/constants/composer";

const QUEUED = [
  "Add a comparison table for the pricing page",
  "Keep the intro under 80 words",
];

function noop() {}

function DemoComposer({ withNudge }: { withNudge: boolean }) {
  const [value, setValue] = useState(
    withNudge
      ? "Draft release notes for the October launch, focus on the new Linear sync."
      : ""
  );
  const isEmpty = value.trim().length === 0;

  return (
    <Composer.Frame
      nudge={
        withNudge ? (
          <Composer.Nudge>
            {QUEUED.map((message) => (
              <Composer.Chip
                className={COMPOSER_QUEUED_CHIP}
                key={message}
                label={message}
                labelClassName={COMPOSER_QUEUED_CHIP_LABEL}
                onEdit={noop}
                onRemove={noop}
                onSteer={noop}
              />
            ))}
            <Composer.Chip
              icon={
                <HugeiconsIcon
                  className="text-muted-foreground size-3.5"
                  icon={File02Icon}
                />
              }
              label="linear-sync-changelog.pdf"
              onClick={noop}
              onRemove={noop}
            />
          </Composer.Nudge>
        ) : null
      }
    >
      <textarea
        aria-label="Message"
        className="placeholder:text-muted-foreground block [field-sizing:content] max-h-50 min-h-12 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Send a message... (type @ for tools, / for skills)"
        value={value}
      />
      <Composer.Toolbar>
        <Composer.ToolbarButton>
          <ModelIcon className="size-3.5" provider="auto" />
          Auto
          <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} />
        </Composer.ToolbarButton>
        <Composer.ToolbarButton>
          <HugeiconsIcon className="size-3.5" icon={AiBrain01Icon} />
          Medium
          <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} />
        </Composer.ToolbarButton>
        <div className="ml-auto flex items-center gap-1">
          <Composer.ToolbarButton
            aria-label="Add context"
            className="size-7 justify-center px-0"
          >
            <HugeiconsIcon className="size-4" icon={AtIcon} />
          </Composer.ToolbarButton>
          <Composer.ToolbarButton
            aria-label="Attach files"
            className="size-7 justify-center px-0"
          >
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
          </Composer.ToolbarButton>
          <Composer.Send
            disabled={isEmpty}
            label="Send message"
            onClick={() => setValue("")}
            tooltip="Send"
          >
            <HugeiconsIcon
              className="size-4"
              icon={ArrowUp02Icon}
              strokeWidth={2}
            />
          </Composer.Send>
        </div>
      </Composer.Toolbar>
    </Composer.Frame>
  );
}

export function DesignSystemComposerDemo() {
  return (
    <div className="grid items-end gap-6 xl:grid-cols-2">
      <div className="space-y-2" data-preview="composer-empty">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Empty
        </p>
        <DemoComposer withNudge={false} />
      </div>
      <div className="space-y-2" data-preview="composer-nudge">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Queue and attachment
        </p>
        <DemoComposer withNudge />
      </div>
    </div>
  );
}
