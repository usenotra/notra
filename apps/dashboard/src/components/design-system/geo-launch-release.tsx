"use client";

import { Button } from "@notra/ui/components/ui/button";
import {
  ReleaseNote,
  ReleaseNoteAction,
  ReleaseNoteContent,
  ReleaseNoteDescription,
  ReleaseNoteFooter,
  ReleaseNoteHeader,
  ReleaseNoteTitle,
  ReleaseNoteVisual,
} from "@notra/ui/components/ui/release-note";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import { useState } from "react";

const ENGINES = [
  { name: "ChatGPT", Icon: Openai },
  { name: "Claude", Icon: ClaudeAiIcon },
  { name: "Gemini", Icon: Google },
  { name: "Perplexity", Icon: Perplexity },
] as const;

function GeoLaunchVisual() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-background ring-foreground/10 w-44 rounded-lg p-3 shadow-sm ring-1">
        <p className="text-muted-foreground text-xs font-medium">Prompts</p>
        <p className="mt-2 truncate font-mono text-xs">best changelog tool</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs">
          <span className="bg-info size-1.5 rounded-full" />
          Scanning
        </span>
      </div>
      <svg
        aria-hidden="true"
        className="text-muted-foreground size-8 shrink-0"
        fill="none"
        viewBox="0 0 32 16"
      >
        <path
          d="M1 8h26M21 2l6 6-6 6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
      <div className="bg-background ring-foreground/10 w-52 rounded-lg p-3 shadow-sm ring-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium">Mentions</p>
          <span className="bg-muted text-foreground rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">
            4
          </span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {ENGINES.map(({ name, Icon }) => (
            <li className="flex items-center gap-2 text-xs" key={name}>
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="text-muted-foreground">Cited</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function GeoLaunchReleaseDemo() {
  const [open, setOpen] = useState(true);

  return (
    <ReleaseNote onOpenChange={setOpen} open={open}>
      <Button disabled={open} onClick={() => setOpen(true)} variant="outline">
        Show release note
      </Button>
      <ReleaseNoteContent>
        <ReleaseNoteVisual>
          <GeoLaunchVisual />
        </ReleaseNoteVisual>
        <ReleaseNoteHeader>
          <ReleaseNoteTitle>GEO is live</ReleaseNoteTitle>
          <ReleaseNoteDescription>
            Each tracked prompt gets its own scan, separate from your changelog,
            with mentions across the engines you follow. Open GEO to see where
            you show up.
          </ReleaseNoteDescription>
        </ReleaseNoteHeader>
        <ReleaseNoteFooter>
          <ReleaseNoteAction>OK</ReleaseNoteAction>
        </ReleaseNoteFooter>
      </ReleaseNoteContent>
    </ReleaseNote>
  );
}
