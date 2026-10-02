import { createFileRoute } from "@tanstack/react-router";

import { jsonError } from "@/utils/api-response";

function POST() {
  return jsonError("Applications are currently closed", 503);
}

export const Route = createFileRoute("/api/oss-program")({
  server: { handlers: { POST } },
});
