import type { ChatSessionSummary } from "@notra/ai/types/chat";

export function getContentChatHistoryGroups(
  sessions: ChatSessionSummary[],
  now = new Date()
) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const previousSevenDaysStart = new Date(todayStart);
  previousSevenDaysStart.setDate(previousSevenDaysStart.getDate() - 7);

  const today: ChatSessionSummary[] = [];
  const previousSevenDays: ChatSessionSummary[] = [];
  const older: ChatSessionSummary[] = [];

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt);
    if (updatedAt >= todayStart) {
      today.push(session);
    } else if (updatedAt >= previousSevenDaysStart) {
      previousSevenDays.push(session);
    } else {
      older.push(session);
    }
  }

  return [
    { key: "today" as const, sessions: today },
    { key: "previousSevenDays" as const, sessions: previousSevenDays },
    { key: "older" as const, sessions: older },
  ].filter((group) => group.sessions.length > 0);
}
