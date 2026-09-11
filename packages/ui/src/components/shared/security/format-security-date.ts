import { format, isValid } from "date-fns";

export function formatSecurityDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (!isValid(date)) {
    return null;
  }
  return format(date, "MMM d, yyyy");
}
