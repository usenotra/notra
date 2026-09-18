import { Tracker } from "./tracker";
import type { GeoTrackerOptions, SvelteKitHandleInput } from "./types";

export function createGeoHandle(options: GeoTrackerOptions) {
  const tracker = new Tracker(options);

  return async <TEvent extends { request: Request }, TResponse>({
    event,
    resolve,
  }: SvelteKitHandleInput<TEvent, TResponse>): Promise<TResponse> => {
    const pending = tracker.track(event.request);
    try {
      return await resolve(event);
    } finally {
      await pending;
    }
  };
}
