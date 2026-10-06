import type { Locale } from "date-fns";
import type { useTranslations } from "use-intl";

export interface AttachmentRow {
  id: string;
  key: string;
  filename: string;
  mediaType: string;
  size: number;
  createdAt: Date;
  url: string;
}

export interface AttachmentTableColumnOptions {
  pendingKey: string | null;
  onDelete: (key: string) => void;
  t: ReturnType<typeof useTranslations<"settings.attachments">>;
  tSettingsShared: ReturnType<typeof useTranslations<"settings.shared">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  deleteLabel: string;
  dateLocale: Locale;
}
