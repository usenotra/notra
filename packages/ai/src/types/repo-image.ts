import type {
  generateRepoImageInputSchema,
  repoImageFormatSchema,
  repoImageModeSchema,
} from "@notra/ai/schemas/repo-image";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  DiagramSpec,
  ExcalidrawScene,
} from "@notra/ai/types/excalidraw-diagram";
import type { OperationalContext } from "@notra/ai/types/operational-log";
import type * as z from "zod";

export type RepoImageMode = z.infer<typeof repoImageModeSchema>;
export type RepoImageFormat = z.infer<typeof repoImageFormatSchema>;

export type RepoImageErrorCode =
  | "missing_config"
  | "agent_failed"
  | "clone_failed"
  | "invalid_source"
  | "not_found";

export type GenerateRepoImageInput = z.infer<
  typeof generateRepoImageInputSchema
>;

export interface GenerateRepoImageParams {
  input: GenerateRepoImageInput;
  userId: string | null;
  restoreSnapshotId?: string | null;
  /** The latest saved spec can be newer than the restored sandbox snapshot. */
  restoreDiagramSpec?: DiagramSpec | null;
  snapshotName?: string;
  /** Override for model comparisons; production uses IMAGE_GEN_MODEL_ID. */
  agentModelId?: string;
  logContext?: Partial<OperationalContext>;
}

export interface GenerateRepoImageResult {
  format: RepoImageFormat;
  pngBase64: string;
  svg: string;
  html: string;
  /** Editable Excalidraw scene, only for the diagram format. */
  excalidrawScene?: ExcalidrawScene;
  /** Compact spec the scene was built from; the source of truth for edits. */
  diagramSpec?: DiagramSpec;
  brandIdentityId?: string;
  sandbox: {
    boxId?: string;
    snapshotId?: string;
    snapshotName?: string;
    snapshotSizeBytes?: number;
    snapshotCreatedAt?: string;
  } | null;
  usage?: AgentTokenUsage;
}

export type RepoImageUsage = AgentTokenUsage | undefined;

/** What one format run produces; generateRepoImage adds format and sandbox. */
export type RepoImageRender = Pick<
  GenerateRepoImageResult,
  "pngBase64" | "svg" | "html" | "excalidrawScene" | "diagramSpec"
> & { usage: RepoImageUsage };

export interface ImageToolConfig {
  chatId?: string;
  organizationId: string;
  userId: string;
  useMarkup?: boolean;
}

export interface ImageRevisionToolConfig {
  organizationId: string;
  userId: string;
  postId: string;
  useMarkup?: boolean;
  chargeAiCredits?: boolean;
}

export interface FontSpec {
  name: string;
  weight: 400 | 500 | 700;
  family: RenderFontId;
}

export type RenderFontId =
  keyof typeof import("@notra/ai/constants/render-font-data").RENDER_FONT_DATA;

export type RepoImageSourceContext =
  | { mode: "prompt"; prompt: string }
  | {
      mode: "pr";
      prNumber: number;
      title: string;
      body: string;
      filesChanged: number;
      additions: number;
      deletions: number;
      topFiles: string[];
    }
  | {
      mode: "commit";
      sha: string;
      shortSha: string;
      message: string;
      filesChanged: number;
      topFiles: string[];
    };
