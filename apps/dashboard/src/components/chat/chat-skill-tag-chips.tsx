"use client";

import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Composer } from "@/components/composer/composer-shell";
import type { ChatSkillTagChipsProps } from "@/types/components/chat-skill-tag-chips";

export function ChatSkillTagChips({
  onRemove,
  skills,
}: ChatSkillTagChipsProps) {
  return (
    <>
      {skills.map((skill) => {
        const label = `/${skill.name}`;
        return (
          <Composer.Chip
            icon={
              <HugeiconsIcon
                className="size-3.5 shrink-0"
                icon={MagicWand01Icon}
              />
            }
            key={skill.name}
            label={label}
            onRemove={() => {
              onRemove(skill.name);
            }}
            removeLabel={`Remove ${label}`}
          />
        );
      })}
    </>
  );
}
