import type { CapabilityDescriptor } from "@notra/ai/schemas/autonomy/capability";
import type { Mandate } from "@notra/ai/schemas/autonomy/mandate";
import type { PlannerOutput } from "@notra/ai/schemas/autonomy/planner";

export type IrisArtifactStatus = "draft" | "published";

export interface IrisArtifact {
  postId: string;
  title: string;
  contentType: string;
  excerpt: string;
  imageUrl?: string;
  status: IrisArtifactStatus;
}

export interface IrisTaskExecutionResult {
  artifacts: IrisArtifact[];
  costCents: number;
  externalRef?: Record<string, unknown>;
}

export interface IrisExecutorTask {
  id: string;
  capabilityName: string;
  capabilityVersion: number;
  params: Record<string, unknown>;
}

export interface IrisSignalContext {
  primarySignal: unknown;
  summaries: string[];
}

export interface ExecuteIrisTaskInput {
  organizationId: string;
  runId: string;
  mandate: Mandate;
  task: IrisExecutorTask;
  signalContext: IrisSignalContext;
  collectionId: string;
}

export interface EnsureIrisCollectionResult {
  collectionId: string;
}

export interface IrisImageMarker {
  index: number;
  raw: string;
  description: string;
}

export interface IrisImageResolution {
  index: number;
  replacement: string | null;
}

export interface IrisImageQcVerdict {
  markerIndex: number;
  description: string;
  accept: boolean;
  reason: string;
  revisionRounds: number;
  postId: string | null;
  imageUrl: string | null;
}

export interface IrisGeneratedImage {
  postId: string;
  imageUrl: string;
  altText: string;
}

export interface IrisImageOutcome {
  verdict: IrisImageQcVerdict;
  image: IrisGeneratedImage | null;
  costCents: number;
}

export interface IrisRepositoryTarget {
  integrationId: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface IrisPlannerInput {
  runId?: string;
  mandate: Mandate;
  signalSummaries: string[];
  recentActionSummaries: string[];
  capabilityCatalog: CapabilityDescriptor[];
}

export interface IrisPlannerResult {
  output: PlannerOutput;
  inputHash: string;
  costCents: number;
}

export interface IrisGeneratedText {
  text: string;
  costCents: number;
}
