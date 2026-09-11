import { describe, expect, test } from "bun:test";

import { findBrandMention } from "../src/utils/geo-brand-mention";

describe("findBrandMention", () => {
  test("matches the company name regardless of casing", () => {
    expect(findBrandMention("Try RESEND for this.", "Resend", [])).toBe(
      "Resend"
    );
  });

  test("matches an alias and returns the alias as configured", () => {
    expect(
      findBrandMention(
        "Install @opencoredev/email-sdk and you are done.",
        "Mail Kit",
        ["@opencoredev/email-sdk"]
      )
    ).toBe("@opencoredev/email-sdk");
  });

  test("treats spaces, hyphens, underscores and scopes as the same separator", () => {
    expect(
      findBrandMention("The email_sdk package is typed.", "Email SDK", [])
    ).toBe("Email SDK");
    expect(
      findBrandMention(
        "Use `email-sdk` for transactional mail.",
        "Email SDK",
        []
      )
    ).toBe("Email SDK");
  });

  test("rejects answers that only share words with the company name", () => {
    const answer = `4. SendGrid, Mailgun, or Brevo — established all-rounders
- All have typed Node SDKs (@sendgrid/mail, mailgun.js, @getbrevo/brevo)
- Email sandbox for testing plus production sending, with a TypeScript SDK`;
    expect(findBrandMention(answer, "Email SDK", [])).toBeNull();
  });

  test("does not match inside a longer word", () => {
    expect(findBrandMention("Notrap is unrelated.", "Notra", [])).toBeNull();
    expect(findBrandMention("Pick Notra.", "Notra", [])).toBe("Notra");
  });

  test("does not match when a combining mark continues the word", () => {
    expect(
      findBrandMention("Notra\u0301xyz is unrelated.", "Notra", [])
    ).toBeNull();
    expect(findBrandMention("Pick Notra\u0301.", "Notra", [])).toBeNull();
  });

  test("does not match when a supplementary-plane letter continues the word", () => {
    expect(
      findBrandMention("Notra\u{1D400} is unrelated.", "Notra", [])
    ).toBeNull();
    expect(
      findBrandMention("\u{1D400}Notra is unrelated.", "Notra", [])
    ).toBeNull();
  });

  test("still matches when a supplementary-plane letter is a separate word", () => {
    expect(findBrandMention("Pick Notra \u{1D400}.", "Notra", [])).toBe(
      "Notra"
    );
  });

  test("ignores empty aliases", () => {
    expect(findBrandMention("Nothing here.", "Acme", ["", "  "])).toBeNull();
  });
});
