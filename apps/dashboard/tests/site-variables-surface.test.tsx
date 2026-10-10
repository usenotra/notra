import { describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import de from "../messages/de.json";
import en from "../messages/en.json";

if (!process.env.NOTRA_VARIABLES_SURFACE_WORKER) {
  test("content variables settings surface", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_VARIABLES_SURFACE_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let unsaved = false;
  const react = await import("react");
  const useState = react.useState;
  mock.module("react", () => ({
    ...react,
    useState: (initial: unknown) => {
      if (unsaved && typeof initial === "function") {
        const value = initial();
        if (Array.isArray(value) && value[0]?.name === "product_name") {
          return useState(
            value.map((row) => ({ ...row, value: "Unsaved value" }))
          );
        }
      }
      return useState(initial);
    },
  }));
  let content = JSON.stringify({
    name: "Acme",
    variables: {
      product_name: "Acme Flow",
      signup_url: "https://example.com/signup",
    },
  });
  mock.module("../src/components/sites/site-context", () => ({
    useSite: () => ({
      organizationId: "test-org",
      organizationSlug: "test",
      siteId: "test-site",
    }),
  }));
  mock.module("../src/components/framework/link", () => ({
    default: ({ children, ...props }: ComponentProps<"a">) => (
      <a {...props}>{children}</a>
    ),
  }));
  mock.module("../src/lib/orpc/query", () => ({
    dashboardOrpc: {
      sites: {
        editor: { read: { queryOptions: () => ({ queryKey: ["variables"] }) } },
      },
    },
  }));
  const { SiteVariablesSettings } =
    await import("../src/components/sites/site-variables-settings");
  describe.each([
    ["en", en],
    ["de", de],
  ] as const)("%s content variables", (locale, messages) => {
    const render = () => {
      const client = new QueryClient();
      client.setQueryData(["variables"], {
        content,
        hasDraft: true,
        draftRevision: 1,
      });
      return renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <IntlProvider locale={locale} messages={messages}>
            <SiteVariablesSettings />
          </IntlProvider>
        </QueryClientProvider>
      );
    };
    test("labels controls, warns against secrets and links to publication", () => {
      content = JSON.stringify({
        name: "Acme",
        variables: {
          product_name: "Acme Flow",
          signup_url: "https://example.com/signup",
        },
      });
      const html = render();
      expect(html).toContain(messages.sites.variables.title);
      expect(html).toContain(messages.sites.variables.publicWarning);
      expect(html).toContain("{{product_name}}");
      expect(html).toContain('value="Acme Flow"');
      expect(html).toContain('value="https://example.com/signup"');
      expect(html).toContain('pattern="[A-Za-z][A-Za-z0-9_-]{0,39}"');
      expect(html).toContain('maxLength="500"');
      expect(html).toContain(messages.sites.variables.reviewAndPublish);
      expect(html).toContain('type="submit"');
      expect(html).toContain("disabled");
    });
    test("unsaved edits cannot navigate to an older draft", () => {
      content = JSON.stringify({
        name: "Acme",
        variables: { product_name: "Acme Flow" },
      });
      unsaved = true;
      try {
        const html = render();
        expect(html).toContain('value="Unsaved value"');
        expect(html).not.toContain(messages.sites.variables.reviewAndPublish);
        expect(html).toContain(messages.sites.variables.saveDraft);
        expect(html).toContain(messages.sites.variables.reset);
      } finally {
        unsaved = false;
      }
    });

    test("malformed config cannot be edited or replaced", () => {
      content = "{";
      const html = render();
      expect(html).toContain(messages.sites.variables.invalidConfig);
      expect(html).toContain('role="alert"');
      expect(html).not.toContain("<input");
      expect(html).not.toContain('type="submit"');
    });
  });
}
