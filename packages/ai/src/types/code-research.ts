export type CodeResearchTarget =
  | { kind: "default" }
  | { kind: "branch"; branch: string }
  | { kind: "pull_request"; number: number }
  | { kind: "commit"; sha: string };

export interface CodeResearchCommandResult {
  exitCode: number;
  output: string;
}

/**
 * The slice of the Upstash Box API the research tools need. `EphemeralBox`
 * and a reattached `Box` both satisfy it, and tests can pass a local fake.
 */
export interface CodeResearchBoxHandle {
  readonly id: string;
  exec: {
    command(command: string): Promise<{
      result: string;
      exitCode: number | null;
    }>;
  };
  delete(): Promise<void>;
}

export interface CodeResearchRepository {
  integrationId: string;
  organizationId: string;
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface CodeResearchWorkspaceState {
  boxId: string;
  repository: CodeResearchRepository;
  target: CodeResearchTarget;
  headSha: string;
  // Unix seconds when Upstash deletes the box.
  expiresAt: number;
}

export interface CodeResearchWorkspace {
  box: CodeResearchBoxHandle;
  state: CodeResearchWorkspaceState;
  reused: boolean;
}

export interface CodeResearchFileListing {
  path: string;
  totalFiles: number;
  truncated: boolean;
  files: string[];
  directories: { path: string; files: number }[];
}

export interface CodeResearchSearchMatch {
  path: string;
  line: number;
  text: string;
}

/** One tool call made by the chat's code researcher, as shown in the UI. */
export interface CodeResearcherStep {
  toolCallId: string;
  toolName: string;
  state: "input-available" | "output-available" | "output-error";
  input: unknown;
  output?: unknown;
  errorText?: string;
}

export interface CodeResearcherProgress {
  status: "running";
  steps: CodeResearcherStep[];
}

export interface CodeResearchCommit {
  sha: string;
  author: string;
  date: string;
  subject: string;
}
