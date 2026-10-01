// Local e2e driver: exercises the REAL @notra/webhooks programs against the
// Docker Postgres, the same way apps/api routes and the generation producer do.
//
// Usage:
//   bun run e2e/cli.ts create-endpoint <org> <url> <events,csv>
//   bun run e2e/cli.ts list-endpoints <org>
//   bun run e2e/cli.ts delete-endpoint <org> <endpointId>
//   bun run e2e/cli.ts publish <org> <completed|failed|skipped> <jobId> [detail]
//   bun run e2e/cli.ts publish-brand <org> <completed|failed> <jobId> <detail>
//   bun run e2e/cli.ts publish-post <org> <postId>
//   bun run e2e/cli.ts retry <org> <deliveryId>
//   bun run e2e/cli.ts deliveries <org> [status] [offset]
import "./env";
import { readFileSync, writeFileSync } from "node:fs";

import { Cause, Effect, Exit, Layer, Schema } from "effect";

import { publishBrandAnalysisOutcome } from "../src/programs/brand-analysis";
import {
  createEndpoint,
  deleteEndpoint,
  listEndpoints,
} from "../src/programs/endpoints";
import { publishGenerationOutcome } from "../src/programs/generation";
import {
  deliveryStats,
  listDeliveries,
  retryDelivery,
} from "../src/programs/history";
import { publishPostPublished } from "../src/programs/posts";
import { configuredCryptoLayer } from "../src/runtime/crypto";
import { postgresDatabaseLayer } from "../src/runtime/postgres";
import {
  DeliveryId,
  EndpointId,
  OrganizationId,
} from "../src/schemas/webhooks";
import type { WebhookCrypto } from "../src/services/crypto";
import type { WebhookDatabase } from "../src/services/database";

const SECRETS_PATH = new URL(".secrets.json", import.meta.url).pathname;

const layer = Layer.mergeAll(postgresDatabaseLayer, configuredCryptoLayer);

const run = async <A, E>(
  program: Effect.Effect<A, E, WebhookDatabase | WebhookCrypto>
) => {
  const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)));
  if (Exit.isFailure(exit)) {
    console.error("FAILED:", Cause.pretty(exit.cause));
    process.exit(1);
  }
  return exit.value;
};

const [command, ...args] = process.argv.slice(2);
const org = (value: string) => Schema.decodeUnknownSync(OrganizationId)(value);

switch (command) {
  case "create-endpoint": {
    const [orgId, url, eventsCsv] = args;
    const result = await run(
      createEndpoint({
        organizationId: org(orgId),
        url,
        events: eventsCsv.split(","),
      })
    );
    console.log(JSON.stringify(result, null, 2));
    // Register the one-time secret with the receiver, keyed by /hook/<mode>.
    const mode = new URL(url).pathname.split("/").pop();
    if (mode) {
      let secrets: Record<string, string> = {};
      try {
        secrets = JSON.parse(readFileSync(SECRETS_PATH, "utf8"));
      } catch {
        // first endpoint — no secrets file yet
      }
      secrets[mode] = result.secret;
      writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2));
      console.log(`[cli] secret for mode "${mode}" registered with receiver`);
    }
    break;
  }
  case "list-endpoints": {
    console.log(
      JSON.stringify(await run(listEndpoints(org(args[0]))), null, 2)
    );
    break;
  }
  case "delete-endpoint": {
    console.log(
      JSON.stringify(
        await run(
          deleteEndpoint(
            org(args[0]),
            Schema.decodeUnknownSync(EndpointId)(args[1])
          )
        )
      )
    );
    break;
  }
  case "publish": {
    const [orgId, status, jobId, detail] = args;
    const eventId = await run(
      publishGenerationOutcome({
        id: jobId,
        organizationId: orgId,
        status: status as "completed" | "failed" | "skipped",
        postId: status === "completed" ? (detail ?? null) : null,
        error: status === "completed" ? null : (detail ?? null),
      })
    );
    console.log(JSON.stringify({ eventId }));
    break;
  }
  case "publish-brand": {
    const [orgId, status, jobId, detail] = args;
    const eventId = await run(
      publishBrandAnalysisOutcome({
        id: jobId,
        organizationId: orgId,
        brandIdentityId: status === "completed" ? (detail ?? "") : "",
        status: status as "completed" | "failed",
        error: status === "failed" ? (detail ?? "unknown") : null,
      })
    );
    console.log(JSON.stringify({ eventId }));
    break;
  }
  case "publish-post": {
    const [orgId, postId] = args;
    const eventId = await run(
      publishPostPublished({ organizationId: orgId, postId })
    );
    console.log(JSON.stringify({ eventId }));
    break;
  }
  case "retry": {
    console.log(
      JSON.stringify(
        await run(
          retryDelivery(
            org(args[0]),
            Schema.decodeUnknownSync(DeliveryId)(args[1])
          )
        )
      )
    );
    break;
  }
  case "deliveries": {
    const rows = await run(
      listDeliveries(org(args[0]), Number(args[2] ?? 0), args[1] ?? "all")
    );
    console.log(JSON.stringify(rows, null, 2));
    break;
  }
  case "stats": {
    console.log(
      JSON.stringify(await run(deliveryStats(org(args[0]))), null, 2)
    );
    break;
  }
  default:
    console.error(`unknown command: ${command}`);
    process.exit(1);
}
