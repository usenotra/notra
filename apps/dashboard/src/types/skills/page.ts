import type {
  SkillUpgradeStrategy,
  SkillUpstreamDetail,
  SkillUpstreamStatus,
} from "@notra/ai/skills/types";
import type { ReactNode } from "react";

import type {
  SKILL_EDITOR_VIEWS,
  SKILL_SORT_KEYS,
  SKILL_STATUSES,
} from "@/constants/skills";

export interface SkillDetailPageClientProps {
  slug: string;
  skillId: string;
}

/** The editable fields of a skill, as saved or as typed. */
export interface SkillEditorSnapshot {
  name: string;
  description: string;
  content: string;
}

export interface SkillDeleteTarget {
  id: string;
  name: string;
}

export type SkillEditorView = (typeof SKILL_EDITOR_VIEWS)[number];

export type SkillStatus = (typeof SKILL_STATUSES)[number];

/** `system` defers to the media query while `next-themes` is still resolving. */
export type SkillDiffThemeType = "system" | "light" | "dark";

export interface SkillListItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  updatedAt: string | Date;
  /** `null` for custom skills: they have no upstream to compare against. */
  upstream?: SkillUpstreamStatus | null;
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
}

export interface SkillDetailHeaderProps {
  slug: string;
  name: string;
  canDelete: boolean;
  deleteDisabled: boolean;
  onDelete: () => void;
  upstream: SkillUpstreamStatus | null;
  /** Full version rows, needed for the "reset to default" preview diff. */
  upstreamDetail: SkillUpstreamDetail | null;
  content: string;
  actionsDisabled: boolean;
  upgradePending: boolean;
  onReviewUpdate: () => void;
  onUpgrade: (strategy: SkillUpgradeStrategy) => void;
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

export interface SkillCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
}

export interface SkillDeleteDialogProps {
  open: boolean;
  name: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface SkillDiffSide {
  label: string;
  content: string;
}

export interface SkillDiffProps {
  before: SkillDiffSide;
  after: SkillDiffSide;
  className?: string;
}

export interface SkillMergeProps {
  /** Merged text; unresolved regions still carry git conflict markers. */
  text: string;
  onTextChange: (text: string) => void;
  /** Changing this remounts the resolver. */
  resetKey: string;
}

export interface SkillUpdateDialogFooterProps {
  isModified: boolean;
  isResolving: boolean;
  /** `true` once every conflict in the merged text is resolved. */
  canSaveResolved: boolean;
  pending: boolean;
  onBack: () => void;
  onDiscard: () => void;
  onMerge: () => void;
  onSaveResolved: () => void;
}

export interface SkillMergeBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

export interface SkillUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  detail: SkillUpstreamDetail;
  /** The org's current content, i.e. the saved skill row. */
  content: string;
  /** `true` when the user edited the description away from its base. */
  descriptionModified: boolean;
  description: string;
  pending: boolean;
  onUpgrade: (
    strategy: SkillUpgradeStrategy,
    payload?: { content: string; description: string }
  ) => void;
}
