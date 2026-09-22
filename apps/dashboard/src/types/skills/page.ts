import type { SKILL_EDITOR_VIEWS, SKILL_SORT_KEYS } from "@/constants/skills";

export interface SkillDetailPageClientProps {
  slug: string;
  name: string;
}

export type SkillEditorView = (typeof SKILL_EDITOR_VIEWS)[number];

export interface SkillListItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  updatedAt: string | Date;
}

export type SkillSortKey = (typeof SKILL_SORT_KEYS)[number];

export type SkillSortDirection = "asc" | "desc";

export interface SkillSortState {
  key: SkillSortKey;
  direction: SkillSortDirection;
}

export interface SkillsTableProps {
  slug: string;
  skills: SkillListItem[];
  sort: SkillSortState;
  onSortChange: (sort: SkillSortState) => void;
  searchActive: boolean;
  loading?: boolean;
}

export interface SkillDetailHeaderProps {
  slug: string;
  name: string;
  isSystem: boolean;
  canDelete: boolean;
  deleteDisabled: boolean;
  onDelete: () => void;
}

export interface SkillEditorFormProps {
  isSystem: boolean;
  savePending: boolean;
  nameInput: string;
  description: string;
  content: string;
  originalContent: string;
  view: SkillEditorView;
  onViewChange: (view: SkillEditorView) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export interface SkillDeleteDialogProps {
  open: boolean;
  name: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
