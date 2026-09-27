import { SOURCE_VALUES, STATUS_VALUES } from "@/constants/logs";
import type {
  LogSourceFilter,
  LogStatusFilter,
} from "@/types/webhooks/webhooks";

export function isLogSourceFilter(value: string): value is LogSourceFilter {
  return SOURCE_VALUES.some((option) => option === value);
}

export function isLogStatusFilter(value: string): value is LogStatusFilter {
  return STATUS_VALUES.some((option) => option === value);
}
