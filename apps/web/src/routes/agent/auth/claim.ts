import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/utils/http";

function OPTIONS() {
  return new Response(null, { status: 204 });
}

function POST() {
  return jsonResponse({
    status: "manual_approval_required",
    credential_types_supported: ["api_key", "bearer"],
    message:
      "Notra agent credentials are issued from the dashboard today. Use /auth.md and the OpenAPI schema to request the required scopes.",
  });
}

export const Route = createFileRoute("/agent/auth/claim")({
  server: { handlers: { OPTIONS, POST } },
});
