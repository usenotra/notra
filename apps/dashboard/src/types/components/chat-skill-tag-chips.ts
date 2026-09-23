import type { SkillSlashOption } from "@/types/skills/slash";

export interface ChatSkillTagChipsProps {
  onRemove?: (name: string) => void;
  skills: readonly SkillSlashOption[];
}
