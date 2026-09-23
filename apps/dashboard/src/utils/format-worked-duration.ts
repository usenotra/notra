import { WORKED_LABEL, WORKING_LABEL } from "@/constants/chat-activity";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

export function formatWorkedDurationLabel(
  seconds: number | null,
  isStreaming: boolean
): string {
  if (isStreaming && (!seconds || seconds <= 0)) {
    return WORKING_LABEL;
  }

  if (!seconds || seconds <= 0) {
    return WORKED_LABEL;
  }

  return `Worked for ${formatElapsedSeconds(seconds)}`;
}
