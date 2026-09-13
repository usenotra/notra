import { createGeoHandler } from "@usenotra/geo/netlify";

export const trackGeoRequest = createGeoHandler({
  token: process.env.NOTRA_GEO_TOKEN ?? "",
  endpoint: process.env.NOTRA_GEO_ENDPOINT,
});
