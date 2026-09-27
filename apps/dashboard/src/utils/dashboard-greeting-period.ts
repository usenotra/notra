import type { GreetingPeriod } from "@/types/dashboard/greeting";

export function getGreetingPeriod(now: Date): GreetingPeriod {
  const hour = now.getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}
