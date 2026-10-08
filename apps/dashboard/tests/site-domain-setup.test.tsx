import { describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

import type { DomainConnectResult } from "@notra/sites-server/types/domain-connect";
import type { DataTableProps } from "@notra/ui/types/data-table";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import de from "../messages/de.json";
import en from "../messages/en.json";
import type { SiteDomain, SiteDomainRow } from "../src/types/sites";

if (!process.env.NOTRA_DOMAIN_SETUP_TEST_WORKER) {
  test("compact domain setup UI", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_DOMAIN_SETUP_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let checking = false;
  let connection: DomainConnectResult = {
    status: "unsupported",
    providerName: "Cloudflare",
    zone: "example.com",
  };
  const mutate = mock(() => {});
  mock.module("../src/lib/hooks/use-site-domain-check", () => ({
    useSiteDomainCheck: () => ({ isPending: checking, mutate }),
  }));
  mock.module("../src/lib/hooks/use-site-domain-connect", () => ({
    useSiteDomainConnect: () => ({ data: connection }),
  }));
  mock.module("@notra/ui/components/ui/data-table", () => ({
    DataTable: ({
      columns,
      data,
      renderRowDetail,
    }: DataTableProps<SiteDomainRow>) => (
      <div>
        {data.map((row) => (
          <div key={row.id}>
            {columns.map((column) => (
              <div key={column.key}>{column.cell?.(row)}</div>
            ))}
            {renderRowDetail?.(row)}
          </div>
        ))}
      </div>
    ),
  }));
  const { SiteDomainSetup } =
    await import("../src/components/sites/site-domain-setup");
  const { SiteDnsRecordsTable } =
    await import("../src/components/sites/site-domain-dns");
  const { SiteDomainsTable } =
    await import("../src/components/sites/site-domains-table");
  const domain = {
    id: "domain",
    hostname: "blog.example.com",
    kind: "subdomain",
    status: "pending",
    records: [
      {
        type: "CNAME",
        name: "blog.example.com",
        value: "sites.example.com",
        purpose: "routing",
      },
      {
        type: "TXT",
        name: "_verify.blog.example.com",
        value: "verification-token",
        purpose: "ownership",
      },
    ],
    lastError: null,
    lastCheckedAt: null,
    verifiedAt: null,
    isPrimary: false,
  } satisfies SiteDomain;

  describe.each([
    ["en", en],
    ["de", de],
  ] as const)("%s domain setup", (locale, messages) => {
    test.each([false, true])("inline refresh pending=%s", (pending) => {
      checking = pending;
      connection = {
        status: "unsupported",
        providerName: "Cloudflare",
        zone: "example.com",
      };
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteDomainSetup
            aliasOrigin="https://alias.example.com"
            domain={domain}
            mounts={{ blog: "/" }}
            organizationId="organization"
            siteId="site"
          />
        </IntlProvider>
      );
      const label = messages.sites.domainsPage.checkLabel.replace(
        "{hostname}",
        domain.hostname
      );
      const button = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
        .map((match) => match[0])
        .find((markup) => markup.includes(`aria-label="${label}"`));
      expect(button).toBeDefined();
      expect(button).toContain(`aria-busy="${String(pending)}"`);
      expect(/\sdisabled(?:=|\s|>)/.test(button ?? "")).toBe(pending);
      expect(button?.includes("motion-safe:animate-spin")).toBe(pending);
      expect(html).toContain(
        messages.sites.domainsPage.dns.openProvider.replace(
          "{provider}",
          "Cloudflare"
        )
      );
      expect(html).not.toContain(messages.sites.domainsPage.status.dnsRequired);
      expect(html).not.toContain(messages.sites.domainsPage.status.verifying);
      expect(html).not.toContain("<ol");
      expect(html).not.toContain(messages.sites.domainsPage.verifyNow);
      expect(mutate).not.toHaveBeenCalled();
    });

    test("DNS-only is a CNAME requirement, not an observed proxy status", () => {
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteDnsRecordsTable records={domain.records} />
        </IntlProvider>
      );
      const rows = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(
        (match) => match[0]
      );
      expect(rows[0]).toContain(messages.sites.domainsPage.dns.proxy);
      expect(rows[1]).toContain(messages.sites.domainsPage.dns.dnsOnly);
      expect(rows[1]).toContain(
        messages.sites.domainsPage.dns.proxyRequirement
      );
      expect(rows[2]).toContain(
        messages.sites.domainsPage.dns.proxyNotApplicable
      );
      expect(rows[2]).not.toContain(messages.sites.domainsPage.dns.dnsOnly);
      const copyButtons = [...html.matchAll(/<button\b[^>]*>/g)].filter(
        (match) =>
          [
            messages.sites.domainsPage.dns.name,
            messages.sites.domainsPage.dns.value,
          ]
            .map((label) =>
              messages.common.labels.copyLabel.replace("{label}", label)
            )
            .some((label) => match[0].includes(`aria-label="${label}"`))
      );
      expect(copyButtons).toHaveLength(4);
      expect(html).toContain("verification-token");
    });

    test.each(["pending", "verifying", "failed"] as const)(
      "%s check details retain their severity with less default information",
      (status) => {
        const html = renderToStaticMarkup(
          <IntlProvider locale={locale} messages={messages} timeZone="UTC">
            <SiteDomainSetup
              aliasOrigin="https://alias.example.com"
              domain={{
                ...domain,
                status,
                lastError: "DNS record is not visible yet",
                lastCheckedAt: new Date("2026-10-07T00:00:00Z"),
              }}
              mounts={{ blog: "/" }}
              organizationId="organization"
              siteId="site"
            />
          </IntlProvider>
        );
        expect(html).toContain("DNS record is not visible yet");
        expect(html).not.toContain('data-slot="alert"');
        if (status === "failed") {
          expect(html).toContain('role="alert"');
          expect(html).toContain(messages.sites.domainsPage.lastErrorTitle);
          expect(html).not.toContain("<details");
        } else {
          const details = html.match(
            /<details\b[^>]*>[\s\S]*?<\/details>/
          )?.[0];
          expect(details).toContain(
            messages.sites.domainsPage.lastCheckDetails
          );
          expect(details).toContain("DNS record is not visible yet");
          expect(details).not.toContain("<details open");
          expect(html).not.toContain('role="alert"');
          expect(html).not.toContain("text-destructive");
        }
      }
    );

    test("domain names have no kind subtext and retain primary designation", () => {
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteDomainsTable
            aliasOrigin="https://alias.example.com"
            domains={[domain]}
            mounts={{ blog: "/" }}
            onRemove={() => {}}
            organizationId="organization"
            siteId="site"
          />
        </IntlProvider>
      );
      expect(html).toContain(domain.hostname);
      expect(html).toContain(messages.sites.domainsPage.primary);
      expect(html).toContain('data-slot="badge"');
      expect(html).not.toContain(messages.sites.domainsPage.notraAddress);
      expect(html).not.toContain(messages.sites.domainsPage.kinds.subdomain);
      expect(html).not.toContain(" · ");
      expect(html).not.toContain("verification-token");
      expect(html).not.toContain("<details");
    });
  });

  test("Domain Connect retains the explicit provider approval action", () => {
    connection = {
      status: "ready",
      providerName: "Vercel",
      applyUrl: "https://dns.example/connect",
    };
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={en} timeZone="UTC">
        <SiteDomainSetup
          aliasOrigin="https://alias.example.com"
          domain={domain}
          mounts={{ blog: "/" }}
          organizationId="organization"
          siteId="site"
        />
      </IntlProvider>
    );
    expect(html).toContain("Connect with Vercel");
    expect(html).toContain(en.sites.domainsPage.dns.dnsOnly);
  });

  test("proxy domains keep their rewrite recipe and verification action", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={en} timeZone="UTC">
        <SiteDomainSetup
          aliasOrigin="https://alias.example.com"
          domain={{ ...domain, kind: "proxy" }}
          mounts={{ blog: "/blog" }}
          organizationId="organization"
          siteId="site"
        />
      </IntlProvider>
    );
    expect(html).not.toContain(en.sites.domainsPage.status.proxyRequired);
    expect(html).not.toContain("<details open");
    expect(html).toContain("vercel.json");
    expect(html.replaceAll("&#x27;", "'")).toContain(
      en.sites.domainsPage.proxy.noCookies
    );
    expect(html).toContain('aria-label="Check blog.example.com"');
    expect(html).not.toContain("<ol");
  });

  test("active domains keep DNS records without a connection offer", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={en} timeZone="UTC">
        <SiteDomainSetup
          aliasOrigin="https://alias.example.com"
          domain={{ ...domain, status: "active", isPrimary: true }}
          mounts={{ blog: "/" }}
          organizationId="organization"
          siteId="site"
        />
      </IntlProvider>
    );
    expect(html).not.toContain(en.sites.domainsPage.status.active);
    expect(html).toContain(en.sites.domainsPage.dns.dnsOnly);
    expect(html).not.toContain("Connect with Vercel");
    expect(html).toContain('aria-label="Check blog.example.com"');
  });

  test("domain details default closed and opening another row closes the first", () => {
    const source = readFileSync(
      new URL(
        "../src/components/sites/site-domains-table.tsx",
        import.meta.url
      ),
      "utf8"
    );
    const handlers = source
      .slice(
        source.indexOf("  const isExpanded ="),
        source.indexOf("  const columns:")
      )
      .replaceAll(": SiteDomainRow", "");
    let expandedId: string | null = null;
    const { isExpanded, toggle } = new Script(
      `${handlers}\n({ isExpanded, toggle });`
    ).runInNewContext({
      get expandedId() {
        return expandedId;
      },
      setExpandedId: (update: (current: string | null) => string | null) => {
        expandedId = update(expandedId);
      },
    });
    const first = { id: "first", kind: "domain", domain };
    const second = { id: "second", kind: "domain", domain };
    expect(isExpanded(first)).toBe(false);
    expect(isExpanded(second)).toBe(false);
    toggle(first);
    expect(isExpanded(first)).toBe(true);
    toggle(second);
    expect(isExpanded(first)).toBe(false);
    expect(isExpanded(second)).toBe(true);
    toggle({ id: "alias", kind: "alias" });
    expect(isExpanded(second)).toBe(true);
    toggle(second);
    expect(isExpanded(second)).toBe(false);
  });
}
