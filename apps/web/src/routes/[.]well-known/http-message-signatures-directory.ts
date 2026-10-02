import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/utils/http";

function GET() {
  return jsonResponse(
    {
      keys: [
        {
          kty: "OKP",
          crv: "Ed25519",
          kid: "notra-web-bot-auth-2026-01",
          use: "sig",
          alg: "EdDSA",
          nbf: 1_767_225_600,
          exp: 1_798_761_600,
          x: "11qYAYKxCrfVS_3ckPuUvV2ZgF1U3BtQ2i5rM0W2Y5U",
        },
      ],
    },
    {
      contentType:
        "application/http-message-signatures-directory+json; charset=utf-8",
      headers: {
        "cache-control": "public, max-age=3600",
      },
    }
  );
}

export const Route = createFileRoute(
  "/.well-known/http-message-signatures-directory"
)({
  server: { handlers: { GET } },
});
