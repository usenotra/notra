import type { CollectionEntry } from "@dualmark/converters";
import type {
  CollectionConfig,
  ParameterizedRouteConfig,
  StaticPageConfig,
} from "@dualmark/nextjs";

import { changelog } from "@/../.source/server";
import { FEATURE_DETAIL_SLUGS } from "@/constants/feature-pages/paths";
import { STATE_OF_AI_SEARCH_PATH } from "@/constants/state-of-ai-search";
import { buildAgentPageMarkdown } from "@/lib/agent/markdown";
import {
  buildBlogAuthorMarkdown,
  listBlogAuthorMarkdownPages,
} from "@/lib/blog/author-markdown";
import {
  buildCompareIndexMarkdown,
  buildCompareMarkdown,
  listCompareMarkdownPages,
} from "@/lib/compare/markdown";
import { buildContributorsMarkdown } from "@/lib/contributors/markdown";
import { buildFeedbackMdPageMarkdown } from "@/lib/feedback-md/markdown";
import {
  buildIntegrationMarkdown,
  buildIntegrationsMarkdown,
  buildGithubIntegrationMarkdown,
  buildGranolaIntegrationMarkdown,
  buildLinearIntegrationMarkdown,
  buildSlackIntegrationMarkdown,
  listIntegrationMarkdownEntries,
} from "@/lib/integrations/markdown";
import { buildMarketingAssetsMarkdown } from "@/lib/marketing-assets/markdown";
import {
  buildMcpMarkdown,
  buildMcpUseCaseMarkdown,
  buildMcpUseCasesMarkdown,
  listMcpUseCaseMarkdownEntries,
} from "@/lib/mcp/markdown";
import {
  buildStateOfAiSearchIndexMarkdown,
  buildStateOfAiSearchReportMarkdown,
} from "@/lib/state-of-ai-search/markdown";
import { listSummaries, loadReport } from "@/lib/state-of-ai-search/reports";
import type { BlogAuthorMarkdownPage } from "@/types/blog-author";
import { listNotraBlogPosts } from "@/utils/blog";
import {
  getChangelogPostHref,
  listNotraChangelogPosts,
} from "@/utils/changelog";
import { buildCtaBannerMarkdown } from "@/utils/cta-banner-markdown";
import { stripFrontmatter } from "@/utils/markdown";
import { readAppMarkdownSource } from "@/utils/markdown-source";
import { MarkdownNotFoundError } from "@/utils/not-found";
import {
  getShowcaseCompany,
  getShowcaseEntrySlug,
  SHOWCASE_COMPANIES,
} from "@/utils/showcase";
import {
  buildBrandMarkdown,
  buildFeaturesMarkdown,
  buildLandingMarkdown,
  buildPricingMarkdown,
} from "@/utils/site-markdown";
import { reportPath } from "@/utils/state-of-ai-search";
import { SITE_URL } from "@/utils/urls";

interface MarkdownTwinData {
  title: string;
  description?: string;
  dateLabel?: string;
  publishedDate?: Date;
}

type MarkdownTwinEntry = CollectionEntry<MarkdownTwinData>;

const LEGAL_PAGES = [
  {
    pattern: "/privacy",
    title: "Privacy Policy",
    filename: "privacy.mdx",
  },
  {
    pattern: "/terms",
    title: "Terms of Service",
    filename: "terms.mdx",
  },
  {
    pattern: "/legal",
    title: "Legal Notice",
    filename: "legal.mdx",
  },
] as const;

const STATIC_MARKDOWN_PAGES = [
  "about",
  "contact",
  "free-hat",
  "html-to-figma",
  "html-to-paper",
  "oss-program",
  "repo-star-video",
  "twitter-thread-creator",
] as const;

function absoluteUrl(pathname: string) {
  return `${SITE_URL}${pathname}`;
}

function withTrailingNewline(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function markdownFromTitleAndBody(title: string, body: string) {
  const content = stripFrontmatter(body).trim();

  return withTrailingNewline([`# ${title}`, "", content].join("\n"));
}

function renderDatedEntry(entry: MarkdownTwinEntry) {
  const lines = [`# ${entry.data.title}`, ""];

  if (entry.data.dateLabel) {
    lines.push(`Date: ${entry.data.dateLabel}`, "");
  }

  lines.push((entry.body ?? "").trim(), "");
  return lines.join("\n");
}

function renderBodyEntry(entry: MarkdownTwinEntry) {
  return withTrailingNewline((entry.body ?? "").trim());
}

async function getBlogEntries(): Promise<MarkdownTwinEntry[]> {
  const posts = await listNotraBlogPosts();

  return posts.map((post) => ({
    id: post.slug,
    data: {
      title: post.title,
      description: post.excerpt,
      dateLabel: post.createdAt,
      publishedDate: new Date(post.createdAt),
    },
    body: `${post.markdown.trim()}\n\n${buildCtaBannerMarkdown()}`,
  }));
}

async function getNotraChangelogEntries(): Promise<MarkdownTwinEntry[]> {
  const posts = await listNotraChangelogPosts();

  return posts.map((post) => ({
    id: post.slug,
    data: {
      title: post.title,
      description: post.excerpt,
      dateLabel: post.createdAt,
      publishedDate: new Date(post.createdAt),
    },
    body: post.markdown,
  }));
}

async function getShowcaseEntries(name: string): Promise<MarkdownTwinEntry[]> {
  const entries = changelog.filter((entry) =>
    entry.info.path.startsWith(`${name}/`)
  );

  return Promise.all(
    entries.map(async (entry) => {
      const slug = getShowcaseEntrySlug(entry.info.path);

      return {
        id: slug,
        data: {
          title: entry.title,
          description: entry.description,
          dateLabel: entry.date,
          publishedDate: new Date(entry.date),
        },
        body: stripFrontmatter(
          readAppMarkdownSource("changelog", entry.info.path)
        ),
      };
    })
  );
}

function toMarkdownEntries(
  pages: BlogAuthorMarkdownPage[],
  bodies: (string | null)[]
): MarkdownTwinEntry[] {
  return pages.map((page, index) => ({
    id: page.slug,
    data: { title: page.title, description: page.description },
    body: bodies[index] ?? "",
  }));
}

async function getBlogAuthorEntries() {
  const pages = await listBlogAuthorMarkdownPages();
  const bodies = await Promise.all(
    pages.map((page) => buildBlogAuthorMarkdown(page.slug))
  );
  return toMarkdownEntries(pages, bodies);
}

function getMcpUseCaseEntries() {
  const pages = listMcpUseCaseMarkdownEntries();
  return toMarkdownEntries(
    pages,
    pages.map((page) => buildMcpUseCaseMarkdown(page.slug))
  );
}

async function buildBlogIndexMarkdown() {
  const posts = await listNotraBlogPosts();
  const list = posts
    .map(
      (post) =>
        `- [${post.title}](${absoluteUrl(`/blog/${post.slug}.md`)}) (${post.createdAt})`
    )
    .join("\n");

  return [
    "# Notra Blog",
    "",
    "Insights, guides and stories from the Notra team.",
    "",
    "## Posts",
    "",
    list || "No blog posts found.",
    "",
  ].join("\n");
}

async function buildNotraChangelogIndexMarkdown() {
  const posts = await listNotraChangelogPosts();
  const list = posts
    .map(
      (post) =>
        `- [${post.title}](${absoluteUrl(`${getChangelogPostHref(post.slug)}.md`)}) (${post.createdAt})`
    )
    .join("\n");

  return [
    "# Notra Changelog",
    "",
    "The latest product updates, release notes and improvements from the Notra team.",
    "",
    "## Entries",
    "",
    list || "No changelog entries found.",
    "",
  ].join("\n");
}

function buildChangelogHubMarkdown() {
  const list = [
    `- [Notra](${absoluteUrl("/changelog/notra.md")})`,
    ...SHOWCASE_COMPANIES.map(
      (company) =>
        `- [${company.name}](${absoluteUrl(`/changelog/${company.slug}.md`)})`
    ),
  ].join("\n");

  return [
    "# Changelog",
    "",
    "See how Notra transforms GitHub activity into professional product updates from real open source projects.",
    "",
    "## Changelogs",
    "",
    list,
    "",
  ].join("\n");
}

function buildShowcaseCompanyMarkdown(name: string) {
  const company = getShowcaseCompany(name);

  if (!company) {
    return "# Not found\n";
  }

  const entries = changelog
    .filter((entry) => entry.info.path.startsWith(`${name}/`))
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime()
    )
    .map(
      (entry) =>
        `- [${entry.title}](${absoluteUrl(`/changelog/${name}/${getShowcaseEntrySlug(entry.info.path)}.md`)}) (${entry.date})`
    )
    .join("\n");

  return [
    `# ${company.name} Changelog`,
    "",
    company.description,
    "",
    `Website: ${company.url}`,
    "",
    "## Entries",
    "",
    entries || "No changelog entries found.",
    "",
  ].join("\n");
}

async function buildLegalMarkdown(title: string, filename: string) {
  const source = await readAppMarkdownSource("legal", filename);
  return markdownFromTitleAndBody(title, source);
}

export function buildDualmarkStaticPages(): StaticPageConfig[] {
  return [
    { pattern: "/", render: () => buildLandingMarkdown() },
    { pattern: "/features", render: () => buildFeaturesMarkdown() },
    { pattern: "/pricing", render: () => buildPricingMarkdown() },
    { pattern: "/brand", render: () => buildBrandMarkdown() },
    { pattern: "/feedback-md", render: () => buildFeedbackMdPageMarkdown() },
    { pattern: "/agent", render: () => buildAgentPageMarkdown() },
    { pattern: "/mcp", render: () => buildMcpMarkdown() },
    { pattern: "/mcp/use-cases", render: () => buildMcpUseCasesMarkdown() },
    { pattern: "/compare", render: () => buildCompareIndexMarkdown() },
    {
      pattern: STATE_OF_AI_SEARCH_PATH,
      render: () => buildStateOfAiSearchIndexMarkdown(),
    },
    ...listSummaries().map((summary) => ({
      pattern: reportPath(summary.slug, summary.edition),
      render: async () => {
        const report = await loadReport(summary.slug, summary.edition);
        return report ? buildStateOfAiSearchReportMarkdown(report) : "";
      },
    })),
    ...listCompareMarkdownPages().map((page) => ({
      pattern: page.pattern,
      render: () => buildCompareMarkdown(page.slug) ?? "",
    })),
    { pattern: "/contributors", render: () => buildContributorsMarkdown() },
    { pattern: "/integrations", render: () => buildIntegrationsMarkdown() },
    {
      pattern: "/integrations/slack",
      render: () => buildSlackIntegrationMarkdown(),
    },
    {
      pattern: "/integrations/github",
      render: () => buildGithubIntegrationMarkdown(),
    },
    {
      pattern: "/integrations/linear",
      render: () => buildLinearIntegrationMarkdown(),
    },
    {
      pattern: "/integrations/granola",
      render: () => buildGranolaIntegrationMarkdown(),
    },
    {
      pattern: "/features/marketing/assets",
      render: () => buildMarketingAssetsMarkdown(),
    },
    { pattern: "/blog", render: () => buildBlogIndexMarkdown() },
    { pattern: "/changelog", render: () => buildChangelogHubMarkdown() },
    {
      pattern: "/changelog/notra",
      render: () => buildNotraChangelogIndexMarkdown(),
    },
    ...SHOWCASE_COMPANIES.map((company) => ({
      pattern: `/changelog/${company.slug}`,
      render: () => buildShowcaseCompanyMarkdown(company.slug),
    })),
    ...FEATURE_DETAIL_SLUGS.map((slug) => ({
      pattern: `/features/${slug}`,
      render: () => readAppMarkdownSource("pages", "features", `${slug}.md`),
    })),
    ...STATIC_MARKDOWN_PAGES.map((page) => ({
      pattern: `/${page}`,
      render: () => readAppMarkdownSource("pages", `${page}.md`),
    })),
    ...LEGAL_PAGES.map((page) => ({
      pattern: page.pattern,
      render: () => buildLegalMarkdown(page.title, page.filename),
    })),
  ];
}

export function buildDualmarkCollections() {
  const collections: Record<string, CollectionConfig> = {
    blogAuthors: {
      route: "blog/author",
      emitListing: false,
      converter: (entry) => withTrailingNewline(entry.body ?? ""),
      getEntries: getBlogAuthorEntries,
    },
    mcpUseCases: {
      route: "mcp/use-cases",
      emitListing: false,
      converter: (entry) => withTrailingNewline(entry.body ?? ""),
      getEntries: getMcpUseCaseEntries,
    },
    blog: {
      route: "blog",
      emitListing: false,
      converter: (entry) => renderDatedEntry(entry as MarkdownTwinEntry),
      getEntries: getBlogEntries,
    },
    notraChangelog: {
      route: "changelog/notra",
      emitListing: false,
      converter: (entry) => renderDatedEntry(entry as MarkdownTwinEntry),
      getEntries: getNotraChangelogEntries,
    },
  };

  for (const company of SHOWCASE_COMPANIES) {
    collections[`showcase-${company.slug}`] = {
      route: `changelog/${company.slug}`,
      emitListing: false,
      converter: (entry) => renderBodyEntry(entry as MarkdownTwinEntry),
      getEntries: () => getShowcaseEntries(company.slug),
    };
  }

  return collections;
}

export function buildDualmarkParameterizedRoutes(): ParameterizedRouteConfig[] {
  return [
    {
      pattern: "/integrations/[id]",
      getStaticPaths: async () =>
        (await listIntegrationMarkdownEntries()).map((entry) => ({
          params: { id: entry.id },
        })),
      render: async ({ params }) => {
        const id = params.id ?? "";
        const markdown = await buildIntegrationMarkdown(id);

        if (!markdown) {
          throw new MarkdownNotFoundError(`/integrations/${id}`);
        }

        return withTrailingNewline(markdown);
      },
    },
  ];
}
