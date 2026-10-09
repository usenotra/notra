import type { CheckRunConclusion } from "./github";

export interface CheckReport {
  conclusion: CheckRunConclusion;
  title: string;
  summary: string;
  liveUrl: string | null;
}
