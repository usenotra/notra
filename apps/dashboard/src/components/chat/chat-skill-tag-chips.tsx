"use client";

import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Composer } from "@notra/ui/components/ui/composer";
import { useTranslations } from "use-intl";

import type { ChatSkillTagChipsProps } from "@/types/components/chat-skill-tag-chips";
import { skillDisplayName } from "@/utils/skills";

export function ChatSkillTagChips({
  onRemove,
  skills,
}: ChatSkillTagChipsProps) {
  const tCommon = useTranslations("common");
  return (
    <>
      {skills.map((skill) => {
        const label = skillDisplayName(skill.name);
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
            onRemove={
              onRemove
                ? () => {
                    onRemove(skill.name);
                  }
                : undefined
            }
            removeLabel={tCommon("labels.removeLabel", { label })}
          />
        );
      })}
    </>
  );
}
