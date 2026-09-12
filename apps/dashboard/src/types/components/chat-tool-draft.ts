export interface ToolDraftPreviewProps {
  title: string;
  markdown: string;
  editorHref?: string;
  onApprove?: () => void;
  onDeny?: () => void;
}
