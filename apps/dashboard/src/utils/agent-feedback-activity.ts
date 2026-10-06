import type {
  AgentFeedbackActivityData,
  AgentFeedbackDailyCount,
} from "@/types/agent-feedback";

const DAY_MS = 86_400_000;

/** Days from `from` to `to`, both inclusive. */
export function activityDayCount(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
}

/** Fills the window with zero days so the chart shows every day, not only active ones. */
export function buildAgentFeedbackActivity(
  dailyCounts: AgentFeedbackDailyCount[],
  windowStart: Date,
  days: number
): AgentFeedbackActivityData {
  const byDay = new Map(dailyCounts.map((row) => [row.day, Number(row.count)]));
  const points = Array.from({ length: days }, (_, index) => {
    const day = new Date(windowStart.getTime() + index * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return { day, value: byDay.get(day) ?? 0 };
  });
  return { points };
}
