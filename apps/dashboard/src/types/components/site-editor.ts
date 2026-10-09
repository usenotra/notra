import type { ReactNode } from "react";

import type {
  SiteCodeAnnotation,
  SiteDraftChange,
  SiteEditorJump,
  SiteEditorLanguage,
  SiteEditorMode,
  SiteEditorSaveState,
  SiteEditorSaveQueue,
  SiteFileTreeFile,
} from "@/types/site-editor";
import type {
  SiteDiagnostic,
  SiteEditorDocument,
  SiteRecord,
} from "@/types/sites";

export interface SiteFileTreeProps {
  files: readonly SiteFileTreeFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  isLoading: boolean;
}

export interface SiteCodeEditorProps {
  path: string;
  initialValue: string;
  label: string;
  editStateKey: string;
  diagnostics: readonly SiteDiagnostic[];
  jump: SiteEditorJump | null;
  onChange: (value: string) => void;
  onSave: () => void;
}

export interface SiteCodeAnnotationRowProps {
  annotation: SiteCodeAnnotation;
}

export interface SiteFileDiffProps {
  path: string;
  before: string | null;
  after: string | null;
  className?: string;
}

export interface SiteEditorPaneProps {
  organizationId: string;
  siteId: string;
  site: SiteRecord;
  path: string;
  baseCommitSha: string | null;
  diagnostics: readonly SiteDiagnostic[];
  jump: SiteEditorJump | null;
  saveQueue: SiteEditorSaveQueue;
  onOpenFilePicker?: () => void;
}

export interface SiteEditorPaneBodyProps {
  path: string;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  mode: SiteEditorMode;
  value: string;
  published: string | null;
  children: ReactNode;
}

export interface SiteEditorHeaderActionsProps {
  canCreateFile: boolean;
  unsaved: boolean;
  draftCount: number;
  onNewFile: () => void;
  onPublish: () => void;
}

export interface SiteEditorEmptyStateProps {
  filesLoading: boolean;
  canCreateFile: boolean;
  onChooseFile: () => void;
  onNewFile: () => void;
}

export interface SiteEditorFilesErrorProps {
  error: Error;
  onRetry: () => void;
}

export interface SiteEditorFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export interface SiteEditorFileBarProps {
  site: SiteRecord;
  path: string;
  document: SiteEditorDocument | null;
  saveState: SiteEditorSaveState;
  hasDraft: boolean;
  isDiscarding: boolean;
  mode: SiteEditorMode;
  onModeChange: (mode: SiteEditorMode) => void;
  onDiscard: () => void;
  onOpenFilePicker?: () => void;
}

export interface SiteEditorSaveErrorProps {
  error: string | undefined;
}

export interface SiteEditorStatusBarProps {
  language: SiteEditorLanguage | null;
  diagnostics: SiteDiagnostic[] | null;
  isValidating: boolean;
  problemsOpen: boolean;
  onToggleProblems: () => void;
}

export interface SiteEditorProblemsProps {
  diagnostics: SiteDiagnostic[];
  onSelect: (diagnostic: SiteDiagnostic) => void;
  onClose: () => void;
}

export interface SiteEditorConflictBannerProps {
  paths: string[];
  isRebasing: boolean;
  canRebase: boolean;
  onSelect: (path: string) => void;
  onRebase: () => void;
  onDismiss: () => void;
}

export interface SitePublishChangeProps {
  organizationId: string;
  siteId: string;
  path: string;
  change: SiteDraftChange;
  defaultOpen: boolean;
}
