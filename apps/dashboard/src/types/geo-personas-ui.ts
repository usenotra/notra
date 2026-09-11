import type { GeoPersonaMemoryKind } from "@notra/db/types/geo-personas";
import type {
  GeoPersona,
  GeoPersonaMemory,
} from "@notra/geo-core/types/geo-personas";
import type { ReactNode } from "react";

export interface PersonasTableProps {
  organizationId: string;
  personas: GeoPersona[];
}

export interface PersonaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  persona: GeoPersona | null;
}

export type PersonaDialogView = "conversation" | "profile";

export interface PersonaAvatarProps {
  persona: Pick<GeoPersona, "id" | "name">;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export interface PersonaSectionProps {
  title: string;
  children: ReactNode;
}

export interface PersonaBulletListProps {
  items: readonly string[];
}

export interface PersonaProfileProps {
  persona: GeoPersona;
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

export interface PersonasRegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
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
import type {
  AnswerReplayProgress,
  GeoSequenceEngineThread,
} from "@/types/geo";

export interface PersonaConversationProps {
  active: GeoSequenceEngineThread | null;
  progress: AnswerReplayProgress | null;
  isLoading: boolean;
  isWaitingForScan: boolean;
  enabled: boolean;
  isScanning: boolean;
  onRunScan: () => void;
}
