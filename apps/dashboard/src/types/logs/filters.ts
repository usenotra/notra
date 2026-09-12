import type {
  LogSourceFilter,
  LogStatusFilter,
} from "@/types/webhooks/webhooks";

export interface LogFiltersProps {
  search: string;
  source: LogSourceFilter;
  status: LogStatusFilter;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: LogSourceFilter) => void;
  onStatusChange: (value: LogStatusFilter) => void;
  onRefresh: () => void;
  isFetching: boolean;
  hasData: boolean;
}
