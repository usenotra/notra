export interface ContentScheduleSummary {
  id: string;
  name: string;
  enabled: boolean;
  autoPublish: boolean;
  outputType: string;
  lookbackWindow: string;
  frequency: string | null;
  hour: number | null;
  minute: number | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  intervalDays: number | null;
  anchorDate: string | null;
  repositoryIds: string[];
  repositories: string[];
  instructions: string | null;
  brandVoiceId: string | null;
}

export type CreateContentScheduleResult =
  | { status: "created"; schedule: ContentScheduleSummary }
  | { status: "duplicate"; schedule: ContentScheduleSummary }
  | { status: "error"; message: string };
