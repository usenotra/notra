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
}
