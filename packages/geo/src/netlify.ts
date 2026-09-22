import { reportGeoError, sendRequestLog } from "./send";
import { Tracker as CoreTracker } from "./tracker";
import type {
  GeoLocation,
  GeoTrackerOptions,
  NetlifyContext,
  NetlifyGeoContext,
} from "./types";

function toGeoLocation(
  geo: NetlifyGeoContext | undefined
): GeoLocation | undefined {
  if (!geo) {
    return;
  }

  const location: GeoLocation = {
    country: geo.country?.code,
    region: geo.subdivision?.code,
    city: geo.city,
    timezone: geo.timezone,
    latitude: geo.latitude === undefined ? undefined : String(geo.latitude),
    longitude: geo.longitude === undefined ? undefined : String(geo.longitude),
  };

  const hasValue = Object.values(location).some((value) => value !== undefined);
  return hasValue ? location : undefined;
}

export class Tracker {
  private readonly options: GeoTrackerOptions;
  private readonly tracker: CoreTracker;

  constructor(options: GeoTrackerOptions) {
    this.options = options;
    this.tracker = new CoreTracker(options);
  }

  track(request: Request, context?: NetlifyContext): void {
    try {
      const payload = this.tracker.buildPayload(request);
      if (!payload) {
        return;
      }

      const geo = toGeoLocation(context?.geo) ?? payload.geo;
      const pending = sendRequestLog({ ...payload, geo }, this.options);

      if (typeof context?.waitUntil === "function") {
        context.waitUntil(pending);
      }
    } catch (error) {
      reportGeoError(this.options.onError, error);
    }
  }
}

export function createGeoHandler(options: GeoTrackerOptions) {
  const tracker = new Tracker(options);
  return (request: Request, context?: NetlifyContext): void => {
    tracker.track(request, context);
  };
}
