"use client";

import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { ChatSkillSlashMenuProps } from "@/types/components/chat-skill-slash-menu";
import { skillDisplayName } from "@/utils/skills";

export function ChatSkillSlashMenu({
  filteredSkills,
  listboxId,
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
        className="border-border bg-background max-h-64 overflow-y-auto rounded-xl border p-1 shadow-sm dark:shadow-none"
        id={listboxId}
        role="listbox"
      >
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill, idx) => {
            const selected = idx === slashIndex;
            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none",
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
                ref={(element) => {
                  if (selected && element) {
                    element.scrollIntoView({ block: "nearest" });
                  }
                }}
                role="option"
                type="button"
              >
                <HugeiconsIcon
                  className="text-muted-foreground size-4 shrink-0"
                  icon={MagicWand01Icon}
                  strokeWidth={2}
                />
                <span className="shrink-0 whitespace-nowrap">
                  {skillDisplayName(skill.name)}
                </span>
                {skill.description ? (
                  <span
                    className="text-muted-foreground max-w-[64ch] min-w-0 flex-1 truncate"
                    title={skill.description}
                  >
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
