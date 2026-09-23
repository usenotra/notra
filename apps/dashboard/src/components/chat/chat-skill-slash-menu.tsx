"use client";

import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import type { ChatSkillSlashMenuProps } from "@/types/components/chat-skill-slash-menu";

export function ChatSkillSlashMenu({
  filteredSkills,
  onSelect,
  organizationSlug,
  skillCount,
  slashIndex,
  slashListRef,
}: ChatSkillSlashMenuProps) {
  return (
    <div
      className="absolute bottom-full left-1 z-50 mb-1 w-72"
      ref={slashListRef}
    >
      <div
        aria-label="Skills"
        className="border-border bg-popover text-popover-foreground max-h-64 overflow-y-auto rounded-md border p-1 shadow-md"
        role="listbox"
      >
        {filteredSkills.length > 0 ? (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold">Skills</div>
            {filteredSkills.map((skill, idx) => (
              <button
                aria-selected={idx === slashIndex}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors outline-none ${
                  idx === slashIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
                  className="size-4 shrink-0"
                  icon={MagicWand01Icon}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">/{skill.name}</span>
                  {skill.description ? (
                    <span className="text-muted-foreground truncate text-xs">
                      {skill.description}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
            {organizationSlug ? (
              <>
                <div className="bg-border -mx-1 my-1 h-px" />
                <Link
                  className="hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none"
                  href={`/${organizationSlug}/skills`}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                >
                  Manage skills
                </Link>
              </>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
            <span className="text-muted-foreground text-xs">
              {skillCount === 0 ? "No skills yet" : "No matching skills"}
            </span>
            {skillCount === 0 && organizationSlug ? (
              <Link
                className="text-primary text-xs hover:underline"
                href={`/${organizationSlug}/skills`}
              >
                Add a skill
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
