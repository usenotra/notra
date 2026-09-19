import type {
  BlogChangelogPreviewUserAction,
  PreviewEffectiveState,
  PreviewIncomingState,
} from "@/types/content/ai-preview";

export function isBlogPreviewBusy(action: BlogChangelogPreviewUserAction) {
  return (
    action === "saving" || action === "publishing" || action === "generating"
  );
}

export function blogPreviewEffectiveState(
  incoming: PreviewIncomingState,
  action: BlogChangelogPreviewUserAction
): PreviewEffectiveState {
  if (incoming === "finished") {
    return "finished";
  }
  if (isBlogPreviewBusy(action)) {
    return "loading";
  }
  return action === "save-failed" ? "finished" : "draft";
}
