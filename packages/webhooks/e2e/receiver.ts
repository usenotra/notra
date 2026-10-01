// Local webhook receiver for end-to-end testing. Verifies Notra signatures,
// simulates various endpoint behaviors (per path mode), and serves a live
// HTML inspector page.
import { existsSync, readFileSync } from "node:fs";

import { RECEIVER_ORIGIN } from "./env";

const SECRETS_PATH = new URL(".secrets.json", import.meta.url).pathname;

type Mode = "ok" | "fail" | "bad" | "flaky" | "slow" | "retryafter";

interface ReceivedRequest {
  at: string;
  mode: string;
  eventType: string | null;
  eventId: string | null;
  deliveryId: string | null;
  timestamp: string | null;
  signatureValid: boolean | null; // null = no secret known
  signatureHeader: string | null;
  payload: string;
  attemptForDelivery: number;
}

const received: ReceivedRequest[] = [];
const flakyCounts = new Map<string, number>();

// Secrets are re-read per request so endpoints created after the receiver
// started (the CLI writes them into .secrets.json) verify without a restart.
const loadSecrets = (): Record<string, string> =>
  existsSync(SECRETS_PATH)
    ? (JSON.parse(readFileSync(SECRETS_PATH, "utf8")) as Record<string, string>)
    : {};

async function verifySignature(
  secret: string,
  rawBody: string,
  headers: Headers
): Promise<boolean> {
  const eventId = headers.get("x-notra-event-id");
  const deliveryId = headers.get("x-notra-delivery-id");
  const timestamp = headers.get("x-notra-timestamp");
  const signature = headers.get("x-notra-signature");
  if (!(eventId && deliveryId && timestamp && signature?.startsWith("v1,"))) {
    return false;
  }
  if (!/^\d+$/.test(timestamp)) {
    return false;
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (skew > 300) {
    return false;
  }
  const raw = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const message = `${eventId}.${deliveryId}.${timestamp}.${rawBody}`;
  const sigBytes = Buffer.from(signature.slice(3), "base64");
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(message)
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const html = await Bun.file(new URL("page.html", import.meta.url)).text();

Bun.serve({
  port: 8788,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === "/api/requests") {
      return Response.json(
        { origin: RECEIVER_ORIGIN, count: received.length, received },
        { headers: { "access-control-allow-origin": "*" } }
      );
    }
    if (url.pathname === "/api/reset") {
      received.length = 0;
      flakyCounts.clear();
      return Response.json({ ok: true });
    }
    if (url.pathname.startsWith("/hook/") && req.method === "POST") {
      const mode = url.pathname.slice("/hook/".length) as Mode;
      const rawBody = await req.text();
      const secret = loadSecrets()[mode];
      const signatureValid = secret
        ? await verifySignature(secret, rawBody, req.headers).catch(() => false)
        : null;
      const deliveryId = req.headers.get("x-notra-delivery-id");
      const attemptForDelivery = deliveryId
        ? received.filter((r) => r.deliveryId === deliveryId).length + 1
        : 0;
      received.unshift({
        at: new Date().toISOString(),
        mode,
        eventType: req.headers.get("x-notra-event"),
        eventId: req.headers.get("x-notra-event-id"),
        deliveryId,
        timestamp: req.headers.get("x-notra-timestamp"),
        signatureValid,
        signatureHeader: req.headers.get("x-notra-signature"),
        payload: rawBody,
        attemptForDelivery,
      });
      console.log(
        `[receiver] ${mode} attempt=${attemptForDelivery} sig=${signatureValid} event=${req.headers.get("x-notra-event")}`
      );
      switch (mode) {
        case "ok":
        case "v2":
          return new Response("ok", { status: 200 });
        case "fail":
          return new Response("boom", { status: 500 });
        case "bad":
          return new Response("bad request", { status: 400 });
        case "flaky": {
          const key = deliveryId ?? "unknown";
          const n = (flakyCounts.get(key) ?? 0) + 1;
          flakyCounts.set(key, n);
          if (n < 3) {
            return new Response(`flaky failure #${n}`, { status: 500 });
          }
          return new Response("ok eventually", { status: 200 });
        }
        case "slow":
          await sleep(15_000);
          return new Response("too late", { status: 200 });
        case "retryafter":
          return new Response("slow down", {
            status: 429,
            headers: { "retry-after": "120" },
          });
        default:
          return new Response("unknown mode", { status: 404 });
      }
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`[receiver] listening on ${RECEIVER_ORIGIN}`);
