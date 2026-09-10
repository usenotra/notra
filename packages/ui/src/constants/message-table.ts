import {
  FileExportIcon,
  FirstBracketIcon,
  LeftToRightListDashIcon,
} from "@hugeicons/core-free-icons";

import type { MessageTableCopyFormat } from "@notra/ui/types/message-table";

export const MESSAGE_TABLE_COPY_RESET_MS = 1500;

export const MESSAGE_TABLE_COPY_FORMATS: readonly {
  id: MessageTableCopyFormat;
  label: string;
  icon: typeof FirstBracketIcon;
}[] = [
  { id: "csv", label: "CSV", icon: FirstBracketIcon },
  { id: "markdown", label: "Markdown", icon: FileExportIcon },
  { id: "plain", label: "Plain", icon: LeftToRightListDashIcon },
];
