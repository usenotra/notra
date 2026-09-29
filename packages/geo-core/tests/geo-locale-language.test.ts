import { expect, test } from "bun:test";

import {
  geoLanguageFromLocale,
  preferredGeoLanguage,
} from "../src/utils/geo-locale-language";

test("maps region locales to their language", () => {
  expect(geoLanguageFromLocale("de-DE")).toBe("German");
  expect(geoLanguageFromLocale("pt_BR")).toBe("Portuguese");
  expect(geoLanguageFromLocale("nb")).toBe("Norwegian");
  expect(geoLanguageFromLocale("xx")).toBeNull();
});

test("picks the first trackable language from an Accept-Language header", () => {
  expect(preferredGeoLanguage("xx-XX,de-DE;q=0.9,en;q=0.8")).toBe("German");
});

test("falls back to English when nothing is trackable", () => {
  expect(preferredGeoLanguage(["xx"])).toBe("English");
  expect(preferredGeoLanguage(null)).toBe("English");
});
