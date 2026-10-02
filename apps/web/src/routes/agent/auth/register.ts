import { createFileRoute } from "@tanstack/react-router";

import { redirectToAuthServer } from "@/utils/oauth-redirect";

function OPTIONS() {
  return new Response(null, { status: 204 });
}

function POST(request: Request) {
  return redirectToAuthServer(
    request,
    "https://oauth.usenotra.com/oauth2/register"
  );
}

export const Route = createFileRoute("/agent/auth/register")({
  server: { handlers: { OPTIONS, POST: ({ request }) => POST(request) } },
});
