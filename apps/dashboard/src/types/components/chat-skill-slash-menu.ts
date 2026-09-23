import type { Ref } from "react";

import type { SkillSlashOption } from "@/types/skills/slash";

export interface ChatSkillSlashMenuProps {
  filteredSkills: readonly SkillSlashOption[];
  onSelect: (skill: SkillSlashOption) => void;
  skillCount: number;
  slashIndex: number;
  slashListRef: Ref<HTMLDivElement>;
}
