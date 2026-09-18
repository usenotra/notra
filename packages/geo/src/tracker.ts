import { shouldTrackRequest } from "./exclude";
import { reportGeoError, sendRequestLog } from "./send";
import { serializeRequest } from "./serialize";
import type { GeoRequestPayload, GeoTrackerOptions } from "./types";

function isSampled(sample: number | undefined): boolean {
  if (sample === undefined || sample >= 1) {
    return true;
  }
  if (sample <= 0) {
    return false;
  }
  return Math.random() < sample;
}

export class Tracker {
  readonly options: GeoTrackerOptions;

  constructor(options: GeoTrackerOptions) {
    this.options = options;
  }

  buildPayload(request: Request): GeoRequestPayload | null {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch (error) {
      reportGeoError(this.options.onError, error);
      return null;
    }

    if (!shouldTrackRequest(request, url, this.options.exclude)) {
      return null;
    }

    if (!isSampled(this.options.sample)) {
      return null;
    }

    return serializeRequest(request);
  }

  async track(request: Request): Promise<void> {
    if (!this.options.token) {
      return;
    }

    try {
      const payload = this.buildPayload(request);
      if (!payload) {
        return;
      }
      await sendRequestLog(payload, this.options);
    } catch (error) {
      reportGeoError(this.options.onError, error);
    }
  }
}
