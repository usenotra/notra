import { expect, test } from "bun:test";

import { getGeoIngestProxyRules } from "./geo-ingest-proxy";

test.each([
  "",
  "   ",
  "ingest.example.com",
  "ftp://ingest.example.com",
  "https://app.example.com/path",
])(
  "keeps local ingestion for invalid or self-referential target %s",
  (target) => {
    expect(getGeoIngestProxyRules(target, "https://app.example.com")).toEqual(
      {}
    );
  }
);

test.each(["https://ingest.example.com", "http://127.0.0.1:3102"])(
  "proxies only ingestion to configured origin %s",
  (origin) => {
    expect(
      getGeoIngestProxyRules(
        ` ${origin}/ignored?query=ignored `,
        "https://app.example.com"
      )
    ).toEqual({
      "/api/geo/ingest": { proxy: `${origin}/api/geo/ingest` },
    });
  }
);
