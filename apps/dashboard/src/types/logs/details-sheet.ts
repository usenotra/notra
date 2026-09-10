import type { Log } from "@/types/webhooks/webhooks";

export interface LogEntryProps {
  entry: Log;
}

export interface LogSelection {
  organizationId: string;
  log: Log;
}

export interface LogDetailsSheetProps {
  organizationId: string;
  organizationSlug: string;
  log: Log | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}
