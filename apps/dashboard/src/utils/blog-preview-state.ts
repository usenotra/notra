import type {
  BlogChangelogPreviewUserAction,
  PreviewEffectiveState,
  PreviewIncomingState,
} from "@/types/content/ai-preview";

export function isBlogPreviewBusy(action: BlogChangelogPreviewUserAction) {
  return action === "saving";
}

export function blogPreviewEffectiveState(
  incoming: PreviewIncomingState,
  action: BlogChangelogPreviewUserAction
): PreviewEffectiveState {
  if (incoming === "finished" || action === "saved") {
    return "finished";
  }
  if (isBlogPreviewBusy(action)) {
    return "loading";
  }
  return "draft";
}
