import { expect, test } from "bun:test";

import { SITE_PREVIEW_PASSWORD_MIN_LENGTH } from "@notra/sites-core/constants/sites";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../../../messages/en.json";
import { SitePreviewAccessModes } from "./site-preview-access-modes";
import { SitePreviewPasswordField } from "./site-preview-password-field";

test("the password input and access-mode select have distinct IDs", () => {
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <SitePreviewAccessModes
        idPrefix="preview-access"
        mode="password"
        onModeChange={() => {}}
      />
      <SitePreviewPasswordField
        editing
        idPrefix="preview-access"
        onChange={() => {}}
        onEdit={() => {}}
        onToggleShowPassword={() => {}}
        passwordSetAt={null}
        showPassword={false}
        tooShort={false}
        value=""
      />
    </IntlProvider>
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(html).toContain('for="preview-access-password-input"');
  const password = [...html.matchAll(/<input\b[^>]*>/g)].find((match) =>
    match[0].includes('id="preview-access-password-input"')
  );
  expect(password?.[0]).toContain('type="password"');
  expect(password?.[0]).toContain(
    `minLength="${SITE_PREVIEW_PASSWORD_MIN_LENGTH}"`
  );
  expect(html).toContain('id="preview-access-mode"');
});

test("access modes use the shared labeled select for every mode including Off", () => {
  for (const mode of ["members", "password", "public", "off"] as const) {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SitePreviewAccessModes
          idPrefix="access"
          mode={mode}
          onModeChange={() => {}}
        />
      </IntlProvider>
    );
    expect(html).toContain('for="access-mode"');
    expect(html).toContain('id="access-mode"');
    expect(html).toContain('data-slot="select-trigger"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain(messages.sites.previewAccess.trigger[mode]);
    expect(html).not.toContain("<select");
    expect(html).not.toContain('role="menu"');
  }
});

test("saved passwords render a change action instead of an empty secret input", () => {
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <SitePreviewPasswordField
        editing={false}
        idPrefix="saved-access"
        onChange={() => {}}
        onEdit={() => {}}
        onToggleShowPassword={() => {}}
        passwordSetAt="2026-10-01T00:00:00Z"
        showPassword={false}
        tooShort={false}
        value=""
      />
    </IntlProvider>
  );
  expect(html).toContain("Password set");
  expect(html).toContain("Change");
  expect(html).not.toContain("<input");
});
