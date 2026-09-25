import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

export function formatWorkedDurationLabel(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "Worked";
  }

  return `Worked for ${formatElapsedSeconds(seconds)}`;
}
