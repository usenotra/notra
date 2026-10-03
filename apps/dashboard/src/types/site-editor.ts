import type {
  SiteDiagnostic,
  SiteEditorDocument,
  SiteRecord,
} from "@/types/sites";

export interface SiteEditorSaveState {
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  error?: string;
  /** When the last autosave landed, for "Draft · saved 3s ago". */
  savedAt?: Date;
}

/** What the status bar calls a file; `text` covers anything else. */
export type SiteEditorLanguage =
  | "mdx"
  | "markdown"
  | "json"
  | "jsx"
  | "css"
  | "text";

/** Edit the draft, or compare it with the published version. */
export type SiteEditorMode = "edit" | "changes";

export type SiteDiffStyle = "unified" | "split";

export interface SiteFileTreeFile {
  path: string;
  /** Images and fonts are listed but stay in the repository. */
  editable: boolean;
  isNew: boolean;
  hasDraft: boolean;
}

/** Where the editor should put the caret after opening a file (from a diagnostic). */
export interface SiteEditorJump {
  path: string;
  line: number;
  /** Bumped per click so jumping to the same line twice still moves the caret. */
  nonce: number;
}

export interface SiteFileTreeProps {
  files: readonly SiteFileTreeFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  isLoading: boolean;
}

/** Diagnostic attached to a line of the open file. */
export interface SiteCodeAnnotation {
  severity: SiteDiagnostic["severity"];
  message: string;
}

export interface SiteCodeEditorProps {
  path: string;
  /** Read once when the editor mounts; later edits stay inside the editor. */
  initialValue: string;
  label: string;
  editStateKey: string;
  diagnostics: readonly SiteDiagnostic[];
  jump: SiteEditorJump | null;
  onChange: (value: string) => void;
  onSave: () => void;
}

export interface SiteFileDiffProps {
  path: string;
  /** Null when the file doesn't exist on that side (new or deleted). */
  before: string | null;
  after: string | null;
  diffStyle: SiteDiffStyle;
  className?: string;
}

export interface SiteEditorPaneProps {
  organizationId: string;
  siteId: string;
  site: SiteRecord;
  path: string;
  baseCommitSha: string | null;
  draftUpdatedAt: Date | null;
  hasConflict: boolean;
  diagnostics: readonly SiteDiagnostic[];
  jump: SiteEditorJump | null;
  /** A draft landed (`updatedAt`) or was discarded (`null`). */
  onDraftChange: (path: string, updatedAt: Date | null) => void;
  onSaveStateChange: (state: SiteEditorSaveState) => void;
  onOpenFilePicker?: () => void;
}

export interface SiteEditorFileBarProps {
  site: SiteRecord;
  path: string;
  document: SiteEditorDocument | null;
  saveState: SiteEditorSaveState;
  savedAt: Date | null;
  hasDraft: boolean;
  hasConflict: boolean;
  isDiscarding: boolean;
  mode: SiteEditorMode;
  diffStyle: SiteDiffStyle;
  onModeChange: (mode: SiteEditorMode) => void;
  onDiffStyleChange: (style: SiteDiffStyle) => void;
  onDiscard: () => void;
  onOpenFilePicker?: () => void;
}

export interface SiteEditorDraftChipProps {
  saveState: SiteEditorSaveState;
  savedAt: Date | null;
  hasDraft: boolean;
  hasConflict: boolean;
  isNewFile: boolean;
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
  onSelect: (path: string) => void;
  onRebase: () => void;
  onDismiss: () => void;
}

export interface SitePublishChangeProps {
  organizationId: string;
  siteId: string;
  path: string;
  change: "added" | "modified" | "deleted";
  /** The first change opens so the dialog shows a diff right away. */
  defaultOpen: boolean;
}
