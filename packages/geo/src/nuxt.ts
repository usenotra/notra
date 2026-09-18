import { Tracker as CoreTracker } from "./tracker";
import type {
  GeoTrackerOptions,
  NitroEventLike,
  NodeRequestLike,
} from "./types";

function toHeaders(nodeRequest: NodeRequestLike): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeRequest.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(name, entry);
      }
      continue;
    }
    if (typeof value === "string") {
      headers.set(name, value);
    }
  }
  return headers;
}

function toRequest(nodeRequest: NodeRequestLike): Request | null {
  const headers = toHeaders(nodeRequest);
  const host = headers.get("host");
  if (!host) {
    return null;
  }

  const protocol = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const url = `${protocol ?? "https"}://${host}${nodeRequest.url ?? "/"}`;

  return new Request(url, {
    method: nodeRequest.method ?? "GET",
    headers,
  });
}

export function toWebRequest(event: NitroEventLike): Request | null {
  if (event.request) {
    return event.request;
  }
  if (event.node?.req) {
    return toRequest(event.node.req);
  }
  return null;
}

export class Tracker {
  private readonly tracker: CoreTracker;

  constructor(options: GeoTrackerOptions) {
    this.tracker = new CoreTracker(options);
  }

  async track(event: NitroEventLike): Promise<void> {
    const request = toWebRequest(event);
    if (!request) {
      return;
    }
    await this.tracker.track(request);
  }
}

export function createGeoHandler(options: GeoTrackerOptions) {
  const tracker = new Tracker(options);
  return async (event: NitroEventLike): Promise<void> => {
    await tracker.track(event);
  };
}
