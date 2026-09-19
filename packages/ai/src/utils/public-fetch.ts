import { resolvePublicHttpUrl } from "@notra/utils/url";
import { Agent, fetch as undiciFetch } from "undici/index.js";

import { publicFetchResponseSchema } from "../schemas/public-fetch";
import type {
  PublicFetchOptions,
  PublicFetchRequestInit,
} from "../types/public-fetch";

async function fetchPublicRequest(
  request: Request,
  signal: AbortSignal,
  redirect: RequestRedirect
) {
  const addresses = await resolvePublicHttpUrl(request.url);
  let addressIndex = 0;
  const dispatcher = new Agent({
    pipelining: 0,
    connect: {
      lookup: (_hostname, options, callback) => {
        queueMicrotask(() => {
          if (options.all) {
            callback(null, addresses);
            return;
          }
          const address = addresses[addressIndex % addresses.length];
          addressIndex += 1;
          if (!address) {
            callback(
              new Error("No validated public address is available."),
              "",
              4
            );
            return;
          }
          callback(null, address.address, address.family);
        });
      },
    },
  });
  const requestInit: PublicFetchRequestInit = {
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    dispatcher,
    duplex: "half",
    headers: request.headers,
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal,
  };
  try {
    const response = await Reflect.apply(undiciFetch, undefined, [
      request.url,
      requestInit,
    ]);
    dispatcher.close().catch(() => undefined);
    return publicFetchResponseSchema.parse(response);
  } catch (error) {
    await dispatcher.close().catch(() => undefined);
    throw error;
  }
}

function createPublicFetchSignal(
  requestSignal: AbortSignal,
  timeoutMs: number | undefined
) {
  return timeoutMs === undefined
    ? requestSignal
    : AbortSignal.any([requestSignal, AbortSignal.timeout(timeoutMs)]);
}

function isRedirect(response: Response): boolean {
  switch (response.status) {
    case 301:
    case 302:
    case 303:
    case 307:
    case 308:
      return true;
    default:
      return false;
  }
}

export async function fetchPublicUrl(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: PublicFetchOptions = {}
) {
  let request = new Request(input, init);
  const signal = createPublicFetchSignal(request.signal, options.timeoutMs);
  const maxRedirects = options.maxRedirects ?? 0;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await fetchPublicRequest(
      request,
      signal,
      maxRedirects > 0 ? "manual" : "error"
    );
    const location = response.headers.get("location");
    if (!(isRedirect(response) && location)) {
      return response;
    }
    if (redirectCount >= maxRedirects) {
      await response.body?.cancel();
      throw new Error("Too many redirects while fetching public URL");
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      await response.body?.cancel();
      throw new Error("Redirects are only supported for GET and HEAD requests");
    }

    const redirectUrl = new URL(location, request.url);
    await response.body?.cancel();
    request = new Request(redirectUrl, {
      headers: request.headers,
      method: request.method,
    });
  }
}

export async function fetchPublicMcpUrl(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number
) {
  const response = await fetchPublicUrl(input, init, { timeoutMs });
  return publicFetchResponseSchema.parse(response);
}
