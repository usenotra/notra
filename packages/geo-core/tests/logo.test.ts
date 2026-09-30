import { describe, expect, test } from "bun:test";

import { GEO_NOTRA_LOGO_PATH } from "../src/constants/geo";
import { competitorLogoSources, projectLogoSources } from "../src/geo/logo";

describe("logo sources", () => {
  test("reserved .example domains never hit the favicon service", () => {
    expect(competitorLogoSources("quillboard.example", null)).toEqual([]);
    expect(competitorLogoSources("docs.example.com", null)).toEqual([]);
    expect(projectLogoSources("fieldnote.example", "fieldnote", null)).toEqual([
      GEO_NOTRA_LOGO_PATH,
    ]);
  });

  test("real domains still use the favicon, then the avatar", () => {
    const sources = projectLogoSources("usenotra.com", "notra", null);
    expect(sources[0]).toContain("google.com/s2/favicons");
    expect(sources[1]).toContain("dicebear");
  });
});
