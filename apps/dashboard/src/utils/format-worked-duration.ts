import { WORKED_LABEL } from "@/constants/chat-activity";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

export function formatWorkedDurationLabel(
  seconds: number | null,
  isStreaming: boolean
): string {
  if (isStreaming) {
    return `Worked for ${formatElapsedSeconds(Math.max(0, seconds ?? 0))}`;
  }

  if (!seconds || seconds <= 0) {
    return WORKED_LABEL;
  }

  return `Worked for ${formatElapsedSeconds(seconds)}`;
}
