import { waitForGeoWork } from "./send";
import { Tracker } from "./tracker";
import type { AstroMiddlewareContext, GeoTrackerOptions } from "./types";

export function createGeoMiddleware(options: GeoTrackerOptions) {
  const tracker = new Tracker(options);

  return async (
    context: AstroMiddlewareContext,
    next: () => Response | Promise<Response>
  ): Promise<Response> => {
    const pending = waitForGeoWork(tracker.track(context.request));
    try {
      return await next();
    } finally {
      await pending;
    }
  };
}
