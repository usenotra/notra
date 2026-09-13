"use client";

import { createParser, useQueryState } from "nuqs";

export const geoProjectQueryParser = createParser({
  parse: (value) => value.trim() || null,
  serialize: (value: string) => value.trim(),
}).withOptions({ history: "replace" });

export function useGeoProjectQueryState() {
  return useQueryState("project", geoProjectQueryParser);
}
