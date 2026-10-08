import { Cloudflare } from "@notra/ui/components/ui/svgs/cloudflare";
import { Vercel } from "@notra/ui/components/ui/svgs/vercel";

import type { FeatureDetailCopy } from "@/types/feature-detail-page";
import type {
  SitesBrandSwatch,
  SitesBuildLogLine,
  SitesCodeLine,
  SitesDeployment,
  SitesDomainOption,
  SitesFact,
  SitesEditorFile,
  SitesHeroPhase,
  SitesPlatform,
  SitesPreviewCheck,
  SitesSectionCopy,
  SitesStarterFile,
  SitesStatTile,
  SitesTrafficRow,
} from "@/types/sites-page";

export const SITES_PAGE: FeatureDetailCopy = {
  meta: {
    path: "/features/sites",
    title: "Sites",
    description:
      "Notra Sites builds a blog and changelog from MDX files in your GitHub repository, with a preview for every pull request, your own domain and pages AI engines can read.",
    ogImageKey: "features",
  },
  heroSubtitle:
    "Write posts as MDX next to your code. Notra builds every push, previews every pull request and serves the result on blog.acme.com or acme.com/blog.",
  signupSource: "feature_sites",
  overview: {
    heading: "Push it and it's live",
    description:
      "Notra builds every commit in an isolated sandbox and switches the whole site live in one step. A broken build never reaches your readers.",
    facts: [
      {
        title: "Live in seconds",
        description:
          "Most builds finish in seconds, and the GitHub check on the commit links to the live site.",
      },
      {
        title: "Errors with file and line",
        description:
          "The GitHub check on the commit lists every build error with the file and line to fix.",
      },
      {
        title: "Restore in one click",
        description:
          "Roll back to any earlier deployment from the dashboard without rebuilding.",
      },
    ],
  },
  steps: {
    heading: "From repository to live blog",
    items: [
      {
        title: "Import your repository",
        description:
          "Install the Notra GitHub App and pick the repository. Posts go in blog/ and changelog entries in changelog/.",
      },
      {
        title: "Merge the starter PR",
        description:
          "Notra opens a pull request with your logo, colors and links from Brand Identity. Merge it and the site is live.",
      },
      {
        title: "Add your domain",
        description:
          "Point blog.acme.com at Notra, or serve acme.com/blog with a rewrite from the website you already run.",
      },
    ],
  },
  cta: {
    heading: "Ship your blog like you ship code",
    subcopy:
      "Import a repository and your first post is live in a few minutes. It's free to start.",
  },
};

export const SITES_HERO_TITLE_LINES = ["Your blog lives", "in your repo."];

export const SITES_DOMAIN = "blog.acme.com";

export const SITES_POST_PATH = "/blog/launch-week";

export const SITES_STAGE_IMAGE = "/features/sites/stage-aurora.webp";

export const SITES_EDITOR_REPO = "acme/website";

export const SITES_EDITOR_TABS = ["launch-week.mdx", "blog.json"] as const;

export const SITES_EDITOR_FILES: SitesEditorFile[] = [
  { name: "blog", depth: 0, folder: true },
  { name: "launch-week.mdx", depth: 1, active: true },
  { name: "hello-world.mdx", depth: 1 },
  { name: "changelog", depth: 0, folder: true },
  { name: "2026-09.mdx", depth: 1 },
  { name: "blog.json", depth: 0 },
  { name: "header.mdx", depth: 0 },
];

export const SITES_EDITOR_LINES: SitesCodeLine[] = [
  [["muted", "---"]],
  [
    ["key", "title"],
    ["muted", ": "],
    ["string", '"Launch week"'],
  ],
  [
    ["key", "date"],
    ["muted", ": "],
    ["string", "2026-10-08"],
  ],
  [["muted", "---"]],
  [],
  [["plain", "Five days, five releases."]],
  [],
  [["tag", "<Tip>"]],
  [["plain", "  Follow along at /blog/feed.xml"]],
  [["tag", "</Tip>"]],
  [],
  [["tag", "<Steps>"]],
  [
    ["tag", "  <Step "],
    ["attr", "title"],
    ["muted", "="],
    ["string", '"Monday"'],
    ["tag", ">"],
    ["plain", "Sites"],
    ["tag", "</Step>"],
  ],
  [
    ["tag", "  <Step "],
    ["attr", "title"],
    ["muted", "="],
    ["string", '"Tuesday"'],
    ["tag", ">"],
    ["plain", "Previews"],
    ["tag", "</Step>"],
  ],
];

export const SITES_EDITOR_NEW_LINE: SitesCodeLine = [
  ["tag", "  <Step "],
  ["attr", "title"],
  ["muted", "="],
  ["string", '"Wednesday"'],
  ["tag", ">"],
  ["plain", "Analytics"],
  ["tag", "</Step>"],
];

export const SITES_EDITOR_CLOSING_LINE: SitesCodeLine = [["tag", "</Steps>"]];

export const SITES_POST = {
  date: "Oct 8, 2026",
  title: "Launch week",
  body: "Five days, five releases.",
  tip: "Follow along at /blog/feed.xml",
  steps: [
    { title: "Monday", body: "Sites" },
    { title: "Tuesday", body: "Previews" },
  ],
  newStep: { title: "Wednesday", body: "Analytics" },
} as const;

export const SITES_HERO_STATUS_LABELS: Record<SitesHeroPhase, string> = {
  typing: "Editing launch-week.mdx",
  push: "git push origin main",
  build: "Building a3f9c21",
  live: `Live on ${SITES_DOMAIN}`,
};

export const SITES_HERO_BUILD_TIME = "12 s";

export const SITES_BROWSER_TAB_TITLE = "Launch week · Acme Blog";

export const SITES_HERO_TIMING = {
  holdMs: 3600,
  typeDelayMs: 700,
  charMs: 34,
  pauseMs: 450,
  pushMs: 1100,
  buildMs: 1900,
} as const;

export const SITES_PIPELINE_PUSH_LINES: SitesCodeLine[] = [
  [
    ["attr", "~/acme"],
    ["key", " main"],
    ["muted", " $ "],
    ["plain", "git push"],
  ],
  [["muted", "To github.com:acme/website.git"]],
  [
    ["muted", "   c08d7f2..a3f9c21  "],
    ["plain", "main -> main"],
  ],
  [],
  [
    ["string", "✓ "],
    ["muted", "Notra Sites check started"],
  ],
];

export const SITES_PIPELINE_BUILD_LINES: SitesBuildLogLine[] = [
  { label: "Compiled 48 pages", time: "3.1 s" },
  { label: "Checked 312 links", time: "1.4 s" },
  { label: "Wrote llms.txt, sitemap and RSS", time: "0.6 s" },
  { label: "Uploaded and verified 1.8 MB", time: "5.2 s" },
  { label: "Switched live in one step", time: "0.1 s" },
];

export const SITES_PIPELINE_BUILD_TIME = "12 s";

export const SITES_DEPLOYMENTS: SitesDeployment[] = [
  {
    commit: "a3f9c21",
    message: "Add launch week post",
    age: "Just now",
    live: true,
  },
  {
    commit: "c08d7f2",
    message: "Changelog: September",
    age: "Yesterday",
    live: false,
  },
  {
    commit: "51be9e0",
    message: "Fix broken image path",
    age: "Oct 6",
    live: false,
  },
];

export const SITES_PIPELINE_EYEBROW = "How it ships";

export const SITES_FEATURES_EYEBROW = "What every site gets";

export const SITES_FEATURES_COPY: SitesSectionCopy = {
  heading: "Everything a company blog needs",
  description:
    "Previews, domains, components, analytics and pages AI engines can read come with every site.",
};

export const SITES_PREVIEWS_COPY: SitesFact = {
  title: "A preview for every pull request",
  description:
    "Each pull request gets its own link and a GitHub check. Previews stay private to your team and never show up in search.",
};

export const SITES_PREVIEW_PR = {
  title: "Draft: October pricing update",
  number: "#42",
  branch: "pricing-post",
  author: "maya",
  url: "pr-42--acme.notra.site",
  access: "Team only",
} as const;

export const SITES_PREVIEW_CHECKS: SitesPreviewCheck[] = [
  { name: "Notra Sites preview", detail: "Preview ready in 11 s" },
  { name: "Notra Sites", detail: "48 pages, no errors" },
];

export const SITES_DOMAINS_COPY: SitesFact = {
  title: "Your domain, your way",
  description:
    "Put the blog on its own subdomain, or keep your website and serve the blog under a path of it.",
};

export const SITES_DOMAIN_OPTIONS: SitesDomainOption[] = [
  {
    label: "Subdomain",
    url: "blog.acme.com",
    detail: "CNAME to cname.notra.site, or one click with your DNS provider",
  },
  {
    label: "Path",
    url: "acme.com/blog",
    detail: "A rewrite from the website you already run",
  },
];

export const SITES_PLATFORMS: SitesPlatform[] = [
  { name: "Vercel", Icon: Vercel },
  { name: "Next.js", src: "/features/sites/nextjs.svg" },
  { name: "Netlify", src: "/features/sites/netlify.svg" },
  { name: "Cloudflare", Icon: Cloudflare },
  { name: "nginx", src: "/features/sites/nginx.svg" },
];

export const SITES_COMPONENTS_COPY: SitesFact = {
  title: "MDX with components",
  description:
    "Callouts, tabs, steps, accordions and code blocks work in every post without an import, plus your own React components.",
};

export const SITES_COMPONENT_TITLE = "Install the SDK";

export const SITES_COMPONENT_NOTE = "Requires Node 20 or later.";

export const SITES_COMPONENT_STEPS = ["Create an API key", "Call the client"];

export const SITES_COMPONENT_TABS = ["npm", "bun", "pnpm"] as const;

export const SITES_COMPONENT_INSTALL = "npm install @acme/sdk";

export const SITES_COMPONENT_ACCORDIONS = [
  "Does it work with monorepos?",
  "Can I bring my own components?",
];

export const SITES_STARTER_COPY: SitesFact = {
  title: "Starts with your brand",
  description:
    "Notra reads your Brand Identity and website and opens a starter pull request with your logo, colors, header and footer.",
};

export const SITES_STARTER_PR = {
  title: "Set up the Acme blog",
  author: "notra-ai",
  branch: "notra/starter",
} as const;

export const SITES_STARTER_FILES: SitesStarterFile[] = [
  { path: "blog.json", additions: 24 },
  { path: "header.mdx", additions: 12 },
  { path: "footer.mdx", additions: 18 },
  { path: "blog/hello-world.mdx", additions: 9 },
];

export const SITES_BRAND_SWATCHES: SitesBrandSwatch[] = [
  { name: "Primary", hex: "#16A34A" },
  { name: "Light", hex: "#4ADE80" },
  { name: "Dark", hex: "#14532D" },
];

export const SITES_AGENTS_COPY: SitesFact = {
  title: "Readable by AI engines",
  description:
    "Every page has a Markdown version, and each site ships llms.txt, sitemaps, RSS and structured data with no setup.",
};

export const SITES_AGENTS_REQUEST = [
  "$ curl blog.acme.com/blog/launch-week \\",
  '    -H "Accept: text/markdown"',
];

export const SITES_AGENTS_RESPONSE = [
  "# Launch week",
  "",
  "Five days, five releases. Here's",
  "everything we shipped.",
];

export const SITES_AGENTS_FILES = [
  "/llms.txt",
  "/llms-full.txt",
  "/sitemap.xml",
  "/blog/feed.xml",
];

export const SITES_ANALYTICS_COPY: SitesFact = {
  title: "See who reads it",
  description:
    "Every site counts people and AI agents with nothing to install. Add Plausible, PostHog or Google Analytics with one line.",
};

export const SITES_ANALYTICS_TILES: SitesStatTile[] = [
  { label: "People", value: "8,214" },
  { label: "AI agents", value: "1,906" },
];

export const SITES_ANALYTICS_PEOPLE = [
  38, 44, 41, 52, 49, 58, 63, 57, 66, 72, 69, 80, 86, 92,
];

export const SITES_ANALYTICS_AGENTS = [
  8, 9, 12, 11, 14, 13, 17, 19, 18, 22, 25, 24, 28, 31,
];

export const SITES_ANALYTICS_ROWS: SitesTrafficRow[] = [
  { agent: "ChatGPT-User", owner: "OpenAI", visits: "812" },
  { agent: "Claude-User", owner: "Anthropic", visits: "604" },
  { agent: "PerplexityBot", owner: "Perplexity", visits: "490" },
];

export const SITES_MOCK_SURFACE_CLASS =
  "border-border bg-background pointer-events-none w-full min-w-0 overflow-clip rounded-2xl border text-left shadow-[0_0.125rem_1.4375rem_#0000001A,0_0.0625rem_0.125rem_#0000000A] select-none dark:shadow-none";

export const SITES_TERMINAL_CLASS =
  "rounded-xl bg-[#18151F] px-4 py-3.5 font-mono text-xs/5.5 text-[#B9B3C9] dark:border dark:border-white/10";
