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
  const [mode, setMode] = useState<ClaudeCodeMode>("bypass");
  const [effort, setEffort] = useState<ClaudeCodeEffort>("high");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      setMode(nextMode);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <ClaudeCodeTerminal title="claude — prompt">
        <ClaudeCodePrompt
          effort={effort}
          mode={mode}
          onKeyDown={handleKeyDown}
          placeholder="Type here · Shift+Tab cycles the mode"
          pullRequest={{ number: 1317 }}
        />
      </ClaudeCodeTerminal>
      <ToggleGroup
        aria-label="Permission mode"
        className="flex-wrap"
        onValueChange={(next) => {
          const [picked] = next as ClaudeCodeMode[];
          if (picked) {
            setMode(picked);
          }
        }}
        size="sm"
        value={[mode]}
        variant="outline"
      >
        {CLAUDE_CODE_MODE_ORDER.map((item) => (
          <ToggleGroupItem key={item} value={item}>
            {item}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        aria-label="Effort"
        className="flex-wrap"
        onValueChange={(next) => {
          const [picked] = next as ClaudeCodeEffort[];
          if (picked) {
            setEffort(picked);
          }
        }}
        size="sm"
        value={[effort]}
        variant="outline"
      >
        {CLAUDE_CODE_EFFORT_ORDER.map((item) => (
          <ToggleGroupItem key={item} value={item}>
            {item}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
