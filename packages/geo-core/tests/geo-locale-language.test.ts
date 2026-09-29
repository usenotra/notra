import { expect, test } from "bun:test";

import { geoOnboardingBrandInputSchema } from "../src/schemas/geo";
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

test("ranks Accept-Language entries by their q weight", () => {
  expect(preferredGeoLanguage("en;q=0.5,de;q=0.9")).toBe("German");
  expect(preferredGeoLanguage("de;q=0,fr")).toBe("French");
});

test("ignores inherited object keys", () => {
  expect(geoLanguageFromLocale("constructor")).toBeNull();
  expect(preferredGeoLanguage("constructor,de")).toBe("German");
});

test("onboarding rejects a prompt language that is not tracked", () => {
  const base = {
    organizationId: "org",
    companyName: "Acme",
    aliases: [],
    prompts: [],
  };
  expect(
    geoOnboardingBrandInputSchema.safeParse({
      ...base,
      languages: ["English"],
      promptLanguage: "German",
    }).success
  ).toBe(false);
  expect(
    geoOnboardingBrandInputSchema.safeParse({
      ...base,
      languages: ["German", "English"],
      promptLanguage: "German",
    }).success
  ).toBe(true);
});
