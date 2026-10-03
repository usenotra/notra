import { createFileRoute } from "@tanstack/react-router";

import { redirectToAuthServer } from "@/utils/oauth-redirect";

function OPTIONS() {
  return new Response(null, { status: 204 });
}

function GET(request: Request) {
  return redirectToAuthServer(
    request,
    "https://oauth.usenotra.com/oauth2/authorize"
  );
}

export const Route = createFileRoute("/agent/auth/authorize")({
  server: { handlers: { OPTIONS, GET: ({ request }) => GET(request) } },
});
