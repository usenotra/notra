import { useFormatter } from "use-intl";

export function useDayLabel() {
  const format = useFormatter();
  return (day: string) => {
    const date = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return day;
    }
    return format.dateTime(date, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };
}
