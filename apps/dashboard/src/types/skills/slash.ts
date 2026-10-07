export interface SkillSlashOption {
  name: string;
  description: string;
}

export interface SlashSkillQuery {
  query: string;
  start: number;
}

export interface ApplySlashSkillResult {
  text: string;
  cursor: number;
}

export interface SlashMenuKeyHandler {
  isOpen: boolean;
  matchCount: number;
  onMove: (delta: 1 | -1) => void;
  onSelect: () => void;
  onClose: () => void;
}
