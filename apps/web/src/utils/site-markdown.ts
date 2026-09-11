import {
  ANSWER_EXAMPLE_HEADING,
  ANSWER_EXAMPLE_SUBCOPY,
} from "@/constants/landing/answer-example";
import { FAQ_CONTENT } from "@/constants/landing/faq";
import {
  FEATURES_ENGINES_COPY,
  FEATURES_GAPS_COPY,
  FEATURES_HEADING,
  FEATURES_SHARE_COPY,
  FEATURES_SUBCOPY_LINE_ONE,
  FEATURES_SUBCOPY_LINE_TWO,
  FEATURES_TRAFFIC_COPY,
} from "@/constants/landing/features";
import { GEO_ENGINE_NAMES } from "@/constants/landing/geo-engines";
import {
  HERO_HEADLINE_CYCLE,
  HERO_HEADLINE_LINE_ONE,
  HERO_HEADLINE_LINE_TWO_PREFIX,
  HERO_HEADLINE_SUFFIX,
  HERO_SUBHEAD,
} from "@/constants/landing/hero";
import { MARQUEE_CAPTION } from "@/constants/landing/marquee-quote";
import {
  PRICING_HEADING,
  PRICING_SUBHEADING,
} from "@/constants/landing/pricing";
import { BRAND_ASSETS, BRAND_COLORS, BRAND_FONTS } from "@/lib/brand/constants";
import {
  COMPARISON_FEATURES,
  PRICING_PLANS,
  SOCIAL_PROOF_LOGOS,
} from "@/utils/constants";
import { buildCtaBannerMarkdown } from "@/utils/cta-banner-markdown";
import { markdownSection } from "@/utils/markdown";
import { SITE_DESCRIPTION, SITE_TAGLINE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

function renderPlanPrice(
  plan: (typeof PRICING_PLANS)[keyof typeof PRICING_PLANS]
) {
  if (plan.name === "Enterprise") {
    return "Contact us";
  }

  return `$${plan.pricing.monthly}/month`;
}

function renderPlanFeatures(
  plan: (typeof PRICING_PLANS)[keyof typeof PRICING_PLANS]
) {
  return plan.features.map((feature) => {
    if (typeof feature === "string") {
      return `- ${feature}`;
    }

    return `- ${feature.label} (${feature.subtitle})`;
  });
}

function renderComparisonValue(value: boolean | string): string {
  if (typeof value !== "boolean") {
    return value;
  }

  return value ? "Yes" : "No";
}

export function buildFeaturesMarkdown() {
  return [
    "# Features",
    "",
    SITE_DESCRIPTION,
    "",
    "Every answer is kept, so you can read what each engine actually said. A crawler fetch and a citation are not the same thing, and Notra keeps them apart.",
    "",
    markdownSection("What Notra tracks", [
      "### Prompts",
      "The buyer questions you want to show up for, in the words a buyer would use. Write them yourself, let Notra pull them from your website or import a CSV. Connect Google Search Console and Notra turns your real search queries into prompt suggestions every week.",
      "",
      "### Engines and models",
      "ChatGPT, Claude, Gemini and Perplexity with web search. Models from OpenAI, Anthropic, Google, Moonshot, Z.AI, DeepSeek, Mistral, Meta and Grok without search. You pick which ones run and the list refreshes as new releases ship.",
      "",
      "### Languages",
      "Run the same prompts in up to five languages. Each language gets its own mention rate, so you can see where you win in English and lose in German.",
      "",
      "### Conversations",
      "Multi-turn chats of up to five turns, replayed against every engine with web search. The follow-up question is usually where the recommendation happens.",
      "",
      "### Scans",
      "Scans run daily by default, or every 48 hours, 3 days, week, 2 weeks or 30 days. Every answer is stored in full with the searches the engine ran and the pages it cited. Zero data retention is available as an add-on for teams that need it.",
    ]),
    markdownSection("What the dashboard shows", [
      `### ${FEATURES_ENGINES_COPY.title}`,
      FEATURES_ENGINES_COPY.description,
      "",
      `### ${FEATURES_SHARE_COPY.title}`,
      FEATURES_SHARE_COPY.description,
      "",
      "### Answers",
      ANSWER_EXAMPLE_SUBCOPY,
      "",
      "### Competitors",
      "Track up to 25 competitors with their domains and the misspellings people use for them. Open any of them to see mentions over time and the exact prompts and engines where they appear instead of you.",
      "",
      "### Agent journeys",
      "Follow a single AI agent across your site: which pages it fetched, in what order and whether it asked for markdown.",
    ]),
    markdownSection("AI traffic, attributed", [
      FEATURES_TRAFFIC_COPY.description,
      "",
      "No script tag. You add the @usenotra/geo package as a proxy or middleware in your Next.js, Nuxt or Netlify site. It sends a small request envelope to Notra, matching happens on our side and anything human is dropped before it is stored.",
      "",
      "Every hit is labelled by purpose: model training, search index, cited in answer (an assistant read the page while answering someone) or referral (a person clicked through from an AI answer).",
    ]),
    markdownSection("Turning gaps into content", [
      `### ${FEATURES_GAPS_COPY.title}`,
      FEATURES_GAPS_COPY.description,
      "",
      "### Write",
      "Pick a gap and choose guide, listicle or comparison. Write plans a brief from your brand identity, your sitemap and the competitors you track. You approve the brief and the draft opens in Content, with real internal links and a FAQ section.",
      "",
      "### Agent readiness",
      "A score out of 100 for how well AI agents can discover, understand and use your website, with a must-do and should-do checklist and copyable fix prompts for your coding agent.",
      "",
      "### Agent feedback",
      "A public URL where AI agents and MCP tools can leave feedback about your product, no token needed. Notra classifies it and files it in an inbox.",
    ]),
    markdownSection("For developers", [
      "- REST API with OpenAPI at https://api.usenotra.com/openapi.json, covering projects, prompts, scans, visibility, gaps, briefs, agent readiness and traffic.",
      "- OAuth 2.1 through oauth.usenotra.com or scoped API keys.",
      "- MCP server at https://mcp.usenotra.com/mcp.",
      "- @usenotra/geo on npm for traffic capture, agent classification and link tagging.",
      "- Docs at https://docs.usenotra.com.",
    ]),
    markdownSection("Studio", [
      "The content automation that Notra started with is still here. Connect GitHub, Linear and Slack, and Notra drafts changelogs, launch posts and social updates in your brand voice, on a schedule or when something ships.",
    ]),
    markdownSection("Next Steps", [
      "- [Pricing](https://www.usenotra.com/pricing.md)",
      "- [Blog](https://www.usenotra.com/blog.md)",
      "- [Changelog](https://www.usenotra.com/changelog.md)",
      "- [Start for free](https://app.usenotra.com/signup)",
    ]),
  ].join("\n");
}

export function buildPricingMarkdown() {
  const planSections = Object.values(PRICING_PLANS)
    .map((plan) =>
      [
        `## ${plan.name}`,
        "",
        plan.description,
        "",
        `Price: ${renderPlanPrice(plan)}`,
        `CTA: [${plan.cta.label}](${plan.cta.href})`,
        "",
        ...renderPlanFeatures(plan),
        "",
      ].join("\n")
    )
    .join("\n");

  const comparisonSections = COMPARISON_FEATURES.map(({ category, features }) =>
    markdownSection(
      category,
      features.map((feature) => {
        const starter = renderComparisonValue(feature.starter);
        const growth = renderComparisonValue(feature.growth);
        const scale = renderComparisonValue(feature.scale);
        const enterprise = renderComparisonValue(feature.enterprise);

        return `- ${feature.name}: Starter ${starter}, Growth ${growth}, Scale ${scale}, Enterprise ${enterprise}`;
      })
    )
  ).join("\n");

  return [
    "# Pricing",
    "",
    "Choose the right Notra plan for your team.",
    "",
    "Upgrade when you need more images, posts, or projects.",
    "",
    planSections,
    "## Feature Comparison",
    "",
    comparisonSections,
  ].join("\n");
}

function listEngines(): string {
  const names = HERO_HEADLINE_CYCLE.map(
    (word) => GEO_ENGINE_NAMES[word.engine]
  );
  const last = names.at(-1);
  if (names.length < 2 || !last) {
    return names.join("");
  }
  return `${names.slice(0, -1).join(", ")} or ${last}`;
}

export function buildLandingMarkdown() {
  const socialProofLines = SOCIAL_PROOF_LOGOS.map(
    (logo) => `- [${logo.name}](${logo.href})`
  );
  const headline = `${HERO_HEADLINE_LINE_ONE} ${HERO_HEADLINE_LINE_TWO_PREFIX} ${listEngines()}${HERO_HEADLINE_SUFFIX}`;

  return [
    "# Notra",
    "",
    SITE_TAGLINE,
    "",
    `## ${headline}`,
    "",
    HERO_SUBHEAD,
    "",
    SITE_DESCRIPTION,
    "",
    "Primary CTA: [Start for free](https://app.usenotra.com/signup)",
    "",
    markdownSection("Explore in Markdown", [
      "- [Design](https://www.usenotra.com/design.md)",
      "- [Features](https://www.usenotra.com/features.md)",
      "- [Pricing](https://www.usenotra.com/pricing.md)",
      "- [Blog](https://www.usenotra.com/blog.md)",
      "- [Changelog](https://www.usenotra.com/changelog.md)",
    ]),
    markdownSection("Social Proof", [MARQUEE_CAPTION, "", ...socialProofLines]),
    markdownSection(FEATURES_HEADING, [
      FEATURES_SUBCOPY_LINE_ONE,
      FEATURES_SUBCOPY_LINE_TWO,
      "",
      `### ${FEATURES_ENGINES_COPY.title}`,
      FEATURES_ENGINES_COPY.description,
      "",
      `### ${FEATURES_SHARE_COPY.title}`,
      FEATURES_SHARE_COPY.description,
      "",
      `### ${FEATURES_TRAFFIC_COPY.title}`,
      FEATURES_TRAFFIC_COPY.description,
      "",
      `### ${FEATURES_GAPS_COPY.title}`,
      FEATURES_GAPS_COPY.description,
    ]),
    markdownSection(ANSWER_EXAMPLE_HEADING, [ANSWER_EXAMPLE_SUBCOPY]),
    markdownSection("Pricing", [
      PRICING_HEADING,
      PRICING_SUBHEADING,
      "",
      "See the dedicated pricing page: [Pricing](https://www.usenotra.com/pricing.md)",
    ]),
    markdownSection(
      FAQ_CONTENT.heading,
      FAQ_CONTENT.items.flatMap((item) => [
        `### ${item.question}`,
        item.answer,
        "",
      ])
    ),
    buildCtaBannerMarkdown(),
  ].join("\n");
}

export function buildBrandMarkdown() {
  const colorLines = BRAND_COLORS.map(
    (color) => `- ${color.name}: ${color.hex} (${color.value}) - ${color.usage}`
  );
  const fontLines = BRAND_FONTS.map(
    (font) =>
      `- [${font.name}](${font.googleFontsUrl}) (${font.source}) - ${font.role}`
  );

  return [
    "# Brand Guidelines",
    "",
    "Official assets and guidelines to help you reference the Notra brand, including our logo, colors and typography.",
    "",
    markdownSection("Assets", [
      `- [Brand kit (zip)](${SITE_URL}${BRAND_ASSETS.zip})`,
      `- Logo: [SVG](${SITE_URL}${BRAND_ASSETS.mark.svg}) / [PNG](${SITE_URL}${BRAND_ASSETS.mark.png})`,
      `- Wordmark: [SVG](${SITE_URL}${BRAND_ASSETS.wordmark.svg}) / [PNG](${SITE_URL}${BRAND_ASSETS.wordmark.png})`,
      `- Wordmark for dark surfaces: [SVG](${SITE_URL}${BRAND_ASSETS.wordmarkDark.svg}) / [PNG](${SITE_URL}${BRAND_ASSETS.wordmarkDark.png})`,
    ]),
    markdownSection("Logo", [
      "The Notra mark is a feather with a lavender fill and ink strokes.",
      "Keep it on a light surface and give it room to breathe. On dark surfaces, place the mark on a cream tile.",
    ]),
    markdownSection("Colors", colorLines),
    markdownSection("Typography", [
      ...fontLines,
      "",
      "The live lockup is the mark plus the word Notra. Marketing headings use Satoshi (`font-display`). Product UI uses Inter. On dark surfaces, sit the mark on a cream tile.",
    ]),
  ].join("\n");
}
