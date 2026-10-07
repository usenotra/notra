import type {
  CodexExecStatus,
  CodexExploredItem,
} from "@notra/ui/types/codex-skin";

export interface CodexStoryExec {
  id: string;
  command: string;
  output?: string;
  status?: CodexExecStatus;
  moreLines?: number;
}

export interface CodexStoryHighlight {
  id: string;
  label: string;
  text: string;
}

export interface CodexStorySession {
  header: { version: string; cwd: string };
  userMessage: string;
  intro: string;
  exec: CodexStoryExec;
  explored: CodexExploredItem[];
  elapsed: string;
  summary: string;
  highlights: CodexStoryHighlight[];
  tableIntro: string;
  table: { headers: string[]; rows: string[][] };
  followUp: string;
  composer: {
    model: string;
    effort: string;
    task: string;
    warnings: number;
    placeholder: string;
  };
}
