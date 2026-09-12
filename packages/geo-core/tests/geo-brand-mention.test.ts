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

  test("compares names after NFC normalization", () => {
    expect(findBrandMention("Try cafe\u0301 today.", "Caf\u00e9", [])).toBe(
      "Caf\u00e9"
    );
  });

  test("treats combining marks and supplementary-plane letters as word characters", () => {
    expect(findBrandMention("Try cafe\u0305 today.", "cafe", [])).toBeNull();
    expect(findBrandMention("Try foo\u{1D400} today.", "foo", [])).toBeNull();
    expect(findBrandMention("\u{1D400}foo today.", "foo", [])).toBeNull();
  });

  test("matches brands inside scripts written without spaces", () => {
    expect(findBrandMention("推荐腾讯云和相关产品。", "腾讯", [])).toBe("腾讯");
    expect(findBrandMention("推荐Notra给团队。", "Notra", [])).toBe("Notra");
    expect(findBrandMention("ใช้Notraสำหรับอีเมล", "Notra", [])).toBe("Notra");
  });

  test("ignores empty aliases", () => {
    expect(findBrandMention("Nothing here.", "Acme", ["", "  "])).toBeNull();
  });
});
