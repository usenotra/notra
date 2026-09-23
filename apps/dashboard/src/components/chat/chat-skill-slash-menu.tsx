"use client";

import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { ChatSkillSlashMenuProps } from "@/types/components/chat-skill-slash-menu";
import { skillDisplayName } from "@/utils/skills";

export function ChatSkillSlashMenu({
  filteredSkills,
  onSelect,
  skillCount,
  slashIndex,
  slashListRef,
}: ChatSkillSlashMenuProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-full z-50 mb-1"
      ref={slashListRef}
    >
      <div
        aria-label="Skills"
        className="border-border bg-background max-h-64 overflow-y-auto rounded-xl border p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none"
        role="listbox"
      >
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill, idx) => {
            const selected = idx === slashIndex;
            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors outline-none",
                  selected
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted"
                )}
                id={`chat-skill-slash-option-${skill.name}`}
                key={skill.name}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(skill);
                }}
                role="option"
                type="button"
              >
                <HugeiconsIcon
                  className="text-muted-foreground size-4 shrink-0"
                  icon={MagicWand01Icon}
                  strokeWidth={2}
                />
                <span className="shrink-0">{skillDisplayName(skill.name)}</span>
                {skill.description ? (
                  <span className="text-muted-foreground min-w-0 truncate">
                    {skill.description}
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="text-muted-foreground px-2 py-3 text-center text-xs">
            {skillCount === 0 ? "No skills yet" : "No matching skills"}
          </div>
        )}
      </div>
    </div>
  );
}
