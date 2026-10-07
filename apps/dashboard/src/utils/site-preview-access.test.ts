import { expect, test } from "bun:test";

import { SITE_PREVIEW_PASSWORD_MIN_LENGTH } from "@notra/sites-core/constants/sites";

import { sitePreviewAccessPlan } from "@/utils/site-preview-access";

const site = {
  previewsEnabled: true,
  previewVisibility: "protected" as const,
  previewPasswordSetAt: "2026-10-01T00:00:00Z",
};

test("an existing password stays unchanged until replacement text or removal is explicit", () => {
  for (const editingPassword of [false, true]) {
    const plan = sitePreviewAccessPlan(site, {
      enabled: true,
      mode: "password",
      password: "",
      editingPassword,
    });
    expect(plan.password).toBeUndefined();
    expect(plan.passwordTooShort).toBe(false);
    expect(plan.isDirty).toBe(false);
  }
  for (const mode of ["members", "public"] as const) {
    const plan = sitePreviewAccessPlan(site, {
      enabled: true,
      mode,
      password: "",
      editingPassword: false,
    });
    expect(plan.password).toBeNull();
    expect(plan.isDirty).toBe(true);
    expect(plan.previewVisibility).toBe(
      mode === "public" ? "public" : "protected"
    );
  }
});

test("Off only disables previews without changing saved visibility or password", () => {
  const plan = sitePreviewAccessPlan(site, {
    enabled: false,
    mode: "public",
    password: "replacement",
    editingPassword: true,
  });
  expect(plan.previewsEnabled).toBe(false);
  expect(plan.settingsChanged).toBe(true);
  expect(plan.previewVisibility).toBe("protected");
  expect(plan.password).toBeUndefined();
  expect(plan.passwordTooShort).toBe(false);
  expect(plan.isDirty).toBe(true);
});

test("new and replacement passwords use the shared minimum length", () => {
  for (const previewPasswordSetAt of [null, site.previewPasswordSetAt]) {
    for (const length of [
      SITE_PREVIEW_PASSWORD_MIN_LENGTH - 1,
      SITE_PREVIEW_PASSWORD_MIN_LENGTH,
    ]) {
      const password = "x".repeat(length);
      const plan = sitePreviewAccessPlan(
        { ...site, previewPasswordSetAt },
        {
          enabled: true,
          mode: "password",
          password,
          editingPassword: true,
        }
      );
      expect(plan.password).toBe(password);
      expect(plan.passwordTooShort).toBe(
        length < SITE_PREVIEW_PASSWORD_MIN_LENGTH
      );
      expect(plan.isDirty).toBe(true);
    }
  }
  expect(
    sitePreviewAccessPlan(
      { ...site, previewPasswordSetAt: null },
      {
        enabled: true,
        mode: "password",
        password: "",
        editingPassword: true,
      }
    ).passwordTooShort
  ).toBe(true);
});
