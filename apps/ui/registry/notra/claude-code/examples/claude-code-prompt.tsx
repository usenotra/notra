"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { ClaudeCodePrompt } from "../components/claude-code-prompt";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import {
  CLAUDE_CODE_EFFORT_ORDER,
  CLAUDE_CODE_MODE_ORDER,
} from "../constants/claude-code";
import type { ClaudeCodeEffort, ClaudeCodeMode } from "../types/claude-code";

const nextMode = (current: ClaudeCodeMode) => {
  const index = CLAUDE_CODE_MODE_ORDER.indexOf(current);
  return CLAUDE_CODE_MODE_ORDER[(index + 1) % CLAUDE_CODE_MODE_ORDER.length];
};

export default function ClaudeCodePromptExample() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ClaudeCodeMode>("auto");
  const [effort, setEffort] = useState<ClaudeCodeEffort>("xhigh");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      setMode(nextMode);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <ClaudeCodeTerminal title="claude — playground">
        <ClaudeCodePrompt
          effort={effort}
          mode={mode}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here · Shift+Tab cycles mode"
          value={value}
        />
      </ClaudeCodeTerminal>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span id="claude-code-mode-label">Mode</span>
          <ToggleGroup
            aria-labelledby="claude-code-mode-label"
            onValueChange={(next: string[]) => {
              const [selected] = next as ClaudeCodeMode[];
              if (selected) {
                setMode(selected);
              }
            }}
            size="sm"
            spacing={1}
            value={[mode]}
          >
            {CLAUDE_CODE_MODE_ORDER.map((item) => (
              <ToggleGroupItem key={item} value={item}>
                {item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span id="claude-code-effort-label">Effort</span>
          <ToggleGroup
            aria-labelledby="claude-code-effort-label"
            onValueChange={(next: string[]) => {
              const [selected] = next as ClaudeCodeEffort[];
              if (selected) {
                setEffort(selected);
              }
            }}
            size="sm"
            spacing={1}
            value={[effort]}
          >
            {CLAUDE_CODE_EFFORT_ORDER.map((item) => (
              <ToggleGroupItem key={item} value={item}>
                {item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
