import { createFileRoute } from "@tanstack/react-router";

import { buildNotraFeedbackMarkdown } from "@/lib/feedback-md/markdown";
import { markdownResponse } from "@/utils/http";

function GET() {
  return markdownResponse(buildNotraFeedbackMarkdown());
}

export const Route = createFileRoute("/feedback.md")({
  server: { handlers: { GET } },
});
