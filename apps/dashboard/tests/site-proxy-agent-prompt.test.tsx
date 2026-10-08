import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import de from "../messages/de.json";
import en from "../messages/en.json";
import { SiteProxySetup } from "../src/components/sites/site-domain-proxy";
import { buildSiteProxyAgentPrompt } from "../src/utils/site-proxy-agent-prompt";

if (!process.env.NOTRA_PROXY_PROMPT_TEST_WORKER) {
  test("proxy agent prompt generation and copy UI", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_PROXY_PROMPT_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  test("the prompt uses the actual hostname, fixed origin and enabled mounts", () => {
    const prompt = buildSiteProxyAgentPrompt(
      "www.acme.example",
      "https://acme.notra.example/",
      { blog: "/journal", changelog: "/updates/releases" }
    );
    expect(prompt).toContain("www.acme.example");
    expect(prompt).toContain("fixed upstream https://acme.notra.example");
    expect(prompt).toContain("enabled mounts: /journal, /updates/releases.");
    expect(prompt).not.toContain("/blog");
    expect(prompt).not.toContain("/changelog");
    expect(prompt.split("\n")).toHaveLength(6);
  });

  test("disabled areas are not invented and root mounts are retained", () => {
    expect(
      buildSiteProxyAgentPrompt("acme.example", "https://alias.example", {
        changelog: "/news",
      })
    ).toContain("enabled mounts: /news.");
    expect(
      buildSiteProxyAgentPrompt("acme.example", "https://alias.example", {
        blog: "/",
      })
    ).toContain("enabled mounts: /.");
  });

  test("the prompt constrains routing, auth, credentials and validation", () => {
    const prompt = buildSiteProxyAgentPrompt(
      "acme.example",
      "https://alias.example",
      { blog: "/journal" }
    );
    for (const instruction of [
      "Detect the platform; do not assume Vercel",
      "native proxy/rewrite configuration",
      "each enabled mount itself and its descendants",
      "not similarly prefixed paths",
      "exact mount prefix, full child path and query string",
      "Preserve unrelated routes and local authentication",
      "Do not forward Cookie, Authorization or other credentials",
      "do not add secrets",
      "not browser redirects",
      "Never accept a request-controlled upstream or create an open proxy",
      "Do not change DNS, provider settings or deploy without explicit approval",
      "CSS/JS assets, feeds and sitemaps",
    ]) {
      expect(prompt).toContain(instruction);
    }
  });

  test.each([
    ["en", en],
    ["de", de],
  ] as const)(
    "%s prompt is primary and manual recipes are collapsed",
    (locale, messages) => {
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteProxySetup
            aliasOrigin="https://alias.example"
            hostname="acme.example"
            mounts={{ blog: "/journal" }}
          />
        </IntlProvider>
      );
      expect(html).toContain(messages.common.labels.copyAgentPrompt);
      expect(html).toContain(messages.sites.domainsPage.proxy.agentPromptLabel);
      expect(html).toContain('rows="6"');
      expect(html.toLowerCase()).toContain("readonly");
      expect(html).toContain("field-sizing-fixed");
      expect(html).toContain("enabled mounts: /journal.");
      expect(html).toContain("fixed upstream https://alias.example");
      expect(html).toContain(messages.sites.domainsPage.proxy.manualSetup);
      expect(html).toContain("<details>");
      expect(html).not.toContain("<details open");
      const disclosures = [
        ...html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g),
      ].map((match) => match[0]);
      expect(disclosures).toHaveLength(2);
      expect(disclosures[0]).toContain(
        messages.sites.domainsPage.proxy.viewPrompt
      );
      expect(disclosures[0]).toContain("<textarea");
      expect(disclosures[0]).toContain("enabled mounts: /journal.");
      expect(disclosures[1]).toContain("vercel.json");
      const primary = html.slice(0, html.indexOf("<details>"));
      expect(primary).toContain(messages.common.labels.copyAgentPrompt);
      expect(primary).not.toContain("<textarea");
      expect(html).toContain(
        `aria-label="${messages.sites.domainsPage.proxy.platform}"`
      );
    }
  );
}
