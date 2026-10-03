import type {
  OpencodeActivityKind,
  OpencodeMcpServer,
} from "@notra/ui/types/opencode-skin";

export interface OpencodeStoryActivity {
  id: string;
  kind: OpencodeActivityKind;
  label?: string;
  detail?: string;
  duration?: string;
}

export interface OpencodeStoryTurn {
  id: string;
  prompt: string;
  /** Activity groups. Lines inside a group stack without a gap. */
  activities: OpencodeStoryActivity[][];
  duration?: string;
}

export interface OpencodeStorySession {
  title: string;
  agent: string;
  model: string;
  provider: string;
  effort: string;
  cwd: string;
  branch: string;
  context: string;
  tokens: string;
  used: string;
  spent: string;
  version: string;
  servers: OpencodeMcpServer[];
  turns: OpencodeStoryTurn[];
}
