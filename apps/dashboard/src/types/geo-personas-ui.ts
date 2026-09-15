import type { GeoPersonaMemoryKind } from "@notra/db/types/geo-personas";
import type {
  GeoPersona,
  GeoPersonaMemory,
  GeoPersonaScanSummary,
} from "@notra/geo-core/types/geo-personas";
import type { ReactNode } from "react";

import type { GeoSequenceEngineThread } from "@/types/geo";

export interface GeoPersonasPageProps {
  params: Promise<{ slug: string }>;
}

export interface GeoPersonasPageHeaderProps {
  action?: ReactNode;
}

export interface PersonaGenerationCounterProps {
  progress: PersonaGenerationProgress;
}

export interface PersonasTableProps {
  organizationId: string;
  personas: GeoPersona[];
}

export interface PersonaTableProps extends PersonasTableProps {
  isAddingPersona: boolean;
  openPersonaId: string | undefined;
  onAutoOpenClose: () => void;
}

export interface PersonaTableRowActionsProps {
  persona: GeoPersona;
  disabled: boolean;
  onDelete: (persona: GeoPersona) => void;
  onRegenerate: (personaId: string) => void;
}

export interface PersonaTableContextMenuProps {
  persona: GeoPersona;
  mutationDisabled: boolean;
  scanDisabled: boolean;
  onDelete: (persona: GeoPersona) => void;
  onRegenerate: (personaId: string) => void;
  onRun: (personaId: string) => void;
  onToggle: (persona: GeoPersona) => void;
  onView: (persona: GeoPersona) => void;
}

export interface PersonaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  persona: GeoPersona | null;
}

export interface PersonaDetailHeaderProps {
  persona: GeoPersona;
  threads: GeoSequenceEngineThread[];
  active: GeoSequenceEngineThread | null;
  scans: GeoPersonaScanSummary[];
  selectedScanId: string | null;
  view: PersonaDialogView;
  isRunning: boolean;
  onRun: () => void;
  onSelectScan: (scanId: string | null) => void;
  onEngineChange: (engine: string) => void;
  onViewChange: (view: PersonaDialogView) => void;
}

export type PersonaDialogView = "conversation" | "prompts" | "profile";

export interface PersonaAvatarProps {
  persona: Pick<GeoPersona, "id" | "name">;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export interface PersonaProfileProps {
  persona: GeoPersona;
}

export interface PersonaPromptsProps {
  prompts: readonly string[];
  disabled: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}

export interface PersonaProfileEditorProps extends PersonaProfileProps {
  organizationId: string;
  onCancel: () => void;
}

/** Memories of one kind, ready to render as a labelled group. */
export interface PersonaMemoryGroup {
  kind: GeoPersonaMemoryKind;
  label: string;
  memories: GeoPersonaMemory[];
}

export interface PersonaGenerationProgress {
  /** 1-based step shown to the user. */
  step: number;
  total: number;
  label: string;
}

export interface GeneratePersonasButtonProps {
  hasPersonas: boolean;
  progress: PersonaGenerationProgress | null;
  onClick: () => void;
}
export interface PersonaConversationProps {
  organizationId: string;
  active: GeoSequenceEngineThread | null;
  isLoading: boolean;
  isWaitingForScan: boolean;
  enabled: boolean;
}
export interface PersonaAddDialogProps {
  open: boolean;
  atLimit: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (brief: string) => Promise<boolean>;
  isPending: boolean;
}
