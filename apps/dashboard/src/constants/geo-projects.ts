/** Generous ceiling for GEO project setup (website analysis + seed data). */
export const GEO_PROJECT_CREATE_TIMEOUT_MS = 10 * 60 * 1000;

export class GeoProjectCreateTimeoutError extends Error {
  constructor() {
    super("Project create timed out");
    this.name = "GeoProjectCreateTimeoutError";
  }
}
