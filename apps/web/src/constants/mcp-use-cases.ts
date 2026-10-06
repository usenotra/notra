import {
  ChartLineData01Icon,
  Compass01Icon,
  QuillWrite01Icon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import { NOTRA_AGENT_FEEDBACK_PROMPT } from "@notra/utils/constants/agent-feedback-prompt";

import type {
  McpUseCase,
  McpUseCaseCategory,
  McpUseCaseCategoryFilter,
  McpUseCaseToolId,
} from "@/types/mcp-use-cases";
import { DOCS_URL } from "@/utils/urls";

export const MCP_USE_CASE_TOOL_LABELS: Record<McpUseCaseToolId, string> = {
  notra: "Notra",
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  "google-search-console": "Google Search Console",
  slack: "Slack",
  github: "GitHub",
  linear: "Linear",
  linkedin: "LinkedIn",
  x: "X",
};

export const MCP_USE_CASES_PATH = "/mcp/use-cases";

export const MCP_USE_CASES_ALL_CATEGORY_ID = "all" as const;

export const MCP_USE_CASES_RELATED_LIMIT = 3;

export const MCP_USE_CASES_BUILD_YOUR_OWN_URL = `${DOCS_URL}/devtools/mcp`;

export const MCP_USE_CASES_SHARE_HREF = "/contact";

export const MCP_USE_CASES_SUBHEAD =
  "Copy a prompt, paste it into Claude Code, Cursor or Codex and let your agent run the whole workflow against your Notra workspace.";

export const MCP_USE_CASES_PRIMARY_CTA = "Get started with Notra MCP";

export const MCP_USE_CASES_SECONDARY_CTA = "Share your workflow";

export const MCP_USE_CASES_PAGE_TITLE = "Notra MCP use cases";

export const MCP_USE_CASES_PAGE_DESCRIPTION =
  "Copy-paste agent workflows for AI visibility tracking, content and reporting, built on the Notra MCP server.";

export const MCP_USE_CASE_CATEGORIES: McpUseCaseCategory[] = [
  {
    id: "strategy-research",
    label: "Strategy & Research",
    icon: Compass01Icon,
  },
  { id: "content-creation", label: "Content Creation", icon: QuillWrite01Icon },
  {
    id: "reporting-automation",
    label: "Reporting & Automation",
    icon: RepeatIcon,
  },
  {
    id: "analytics-monitoring",
    label: "Analytics & Monitoring",
    icon: ChartLineData01Icon,
  },
];

export const MCP_USE_CASE_CATEGORY_FILTERS: McpUseCaseCategoryFilter[] = [
  { id: MCP_USE_CASES_ALL_CATEGORY_ID, label: "All" },
  ...MCP_USE_CASE_CATEGORIES,
];

export const MCP_USE_CASE_FILTER_IDS = MCP_USE_CASE_CATEGORY_FILTERS.map(
  (filter) => filter.id
);

const MCP_USE_CASE_WORKFLOWS: McpUseCase[] = [
  {
    slug: "search-console-to-prompt-discovery",
    title: "Search Console to prompt discovery",
    tagline: "Turn high-potential Search Console queries into tracked prompts",
    category: "strategy-research",
    stack: ["notra", "google-search-console"],
    prompt:
      'Pull the last 90 days of Google Search Console queries for our site and keep the question-style ones with real impressions but a weak position. Compare them against the prompts we already track in Notra, create the strongest 20 as new GEO prompts tagged "gsc-discovery" and disable any existing prompt that has had zero mentions across every engine for the last 30 days. Finish with a table of what you added, what you paused and why.',
    tools: [
      "list_geo_prompts",
      "list_geo_prompt_result_summaries",
      "create_geo_prompt",
      "import_geo_prompts",
      "update_geo_prompt",
    ],
    body: [
      "Most prompt sets are guesses about what people might ask. Search Console records what they type, and its question-style queries are the ones AI assistants most likely answer.",
      "The agent creates Notra prompts from high-intent Search Console questions and pauses prompts that stopped earning mentions.",
      "Your prompt set then follows what people search and refreshes each time you run the agent.",
    ],
  },
  {
    slug: "weekly-ai-visibility-brief",
    title: "Weekly AI visibility brief",
    tagline: "Your AI search week in review, posted straight to Slack",
    category: "reporting-automation",
    stack: ["notra", "slack"],
    prompt:
      "What happened to our AI visibility last week? Use Notra to pull overall mention rate per engine compared to the prior week, the sentiment score and any notable shifts by engine, share of voice against our top three competitors and the five prompts with the biggest gains and drops. Flag any competitor that moved more than five points. Write it as a short brief with one recommended focus for the week and post the summary to #marketing.",
    tools: [
      "get_geo_visibility_overview",
      "get_geo_visibility_timeseries",
      "get_geo_changes",
      "get_geo_sentiment",
      "get_geo_competitor_share",
    ],
    body: [
      "One prompt runs a full AI visibility analysis and posts a weekly brief to the Slack channel your team already reads.",
      "The agent pulls mention rates across ChatGPT, Perplexity, Gemini, Claude and Google AI Overviews, compares week over week, lists the prompts behind the biggest changes and flags competitor moves worth reacting to.",
      "Run it on Monday morning so the team starts the week knowing where visibility moved and what to do next.",
    ],
  },
  {
    slug: "find-your-ai-model-blind-spot",
    title: "Find your AI model blind spot",
    tagline: "Diagnose why your visibility differs across engines",
    category: "analytics-monitoring",
    stack: ["notra", "chatgpt", "perplexity"],
    prompt:
      "Get our mention rate per answer engine for the last 30 days and identify the engine where we are strongest and the one where we are weakest. For both engines, list the sources those answers cite most often and check whether our own domain appears. Compare the two: which source types each engine leans on, which domains we appear in on the strong engine but not the weak one and whether the gap is a content problem or a distribution problem. Return a diagnosis and three to five concrete actions to close it.",
    tools: [
      "get_geo_visibility_overview",
      "list_geo_prompt_result_summaries",
      "get_geo_prompt_result_detail",
      "list_geo_shelf_sources",
    ],
    body: [
      "You can rank high on Perplexity and never appear on ChatGPT for the same questions. The cause is usually the set of sources each engine trusts.",
      "Once you know which engine leaves you out and which domains it cites instead, you have a fix you can act on.",
      "The agent returns a list of actions covering which source types to earn coverage from, which domains to target and whether to write or distribute.",
    ],
  },
  {
    slug: "content-gap-to-published-post",
    title: "Content gap to published post",
    tagline: "Turn the questions AI can't answer about you into a draft",
    category: "content-creation",
    stack: ["notra", "claude"],
    prompt:
      "List our open GEO content gaps and pick the one with the most prompts behind it. Plan a content brief for it, show me the outline and once I approve, generate the post in our brand voice as a draft. Link the draft back to the gap so we can measure whether mentions improve after it goes live.",
    tools: [
      "list_geo_content_gaps",
      "plan_geo_content_brief",
      "approve_geo_content_brief",
      "generate_post",
      "update_post",
    ],
    body: [
      "Content gaps are the prompts where AI engines answer with competitors or say nothing at all. Each one points to a page you haven't written yet.",
      "The agent ranks gaps by how many prompts they cover and plans a brief with the angle and structure. Once you approve it, the agent writes the draft in your brand voice.",
      "The draft stays tied to the gap it came from, so the next scan tells you whether the page raised your mention rate.",
    ],
  },
  {
    slug: "changelog-from-merged-prs",
    title: "Changelog from merged PRs",
    tagline: "Ship the week's changelog without opening the editor",
    category: "content-creation",
    stack: ["notra", "github"],
    prompt:
      "Check that our GitHub integration is connected, then generate a changelog post from everything merged this week. Group it by feature, fix and improvement, keep the brand voice and skip internal refactors. Show me the draft, and once I say go, schedule it for Thursday 10:00 in our timezone.",
    tools: [
      "list_integrations",
      "get_brand_identity",
      "generate_post",
      "update_post",
      "create_schedule",
    ],
    body: [
      "Engineering teams mean to write a changelog every week and rarely do, even though merged pull requests already hold the material.",
      "The agent reads the week's GitHub activity through Notra, drafts a changelog in your brand voice and queues it for the slot you choose.",
      "Run it every week and your users get a changelog on a fixed schedule.",
    ],
  },
  {
    slug: "competitor-share-of-voice-watch",
    title: "Competitor share of voice watch",
    tagline: "Know when a competitor starts winning your prompts",
    category: "analytics-monitoring",
    stack: ["notra", "chatgpt", "gemini"],
    prompt:
      "Suggest competitors we are not tracking yet based on who appears in our prompt answers, and add the two that show up most. Then pull share of voice for all tracked competitors over the last 30 days versus the previous 30. For any competitor that gained more than three points, open their detail, list the prompts where they overtook us and summarize what those answers say about them that they don't say about us.",
    tools: [
      "suggest_geo_competitors",
      "upsert_geo_competitor",
      "get_geo_competitor_share",
      "get_geo_competitor_detail",
      "list_geo_prompt_result_summaries",
    ],
    body: [
      "Share of voice in AI answers moves faster than search rankings. A competitor can go from absent to recommended in two weeks after the right engine cites one of its pages.",
      "The agent adds brands that already appear in your answers to the competitor list, then flags the ones gaining ground and quotes the engines to explain why.",
      "You hear about it early, with the prompts to target, before it costs you a deal.",
    ],
  },
  {
    slug: "campaign-sentiment-before-and-after",
    title: "Campaign sentiment before and after",
    tagline: "See whether your campaign changed how AI describes your brand",
    category: "analytics-monitoring",
    stack: ["notra", "slack"],
    prompt:
      "Compare our GEO sentiment for the 30 days before [campaign start] with the 30 days after. Pull the overall score for each period, the sentiment analysis with the phrases AI uses to describe us and the strongest evidence quotes on both sides. Tell me whether the language shifted toward our campaign messaging, which engines responded most and which did not move at all. Post a before-and-after summary to #brand.",
    tools: [
      "get_geo_sentiment",
      "get_geo_sentiment_analysis",
      "list_geo_sentiment_evidence",
      "get_geo_snapshot",
    ],
    body: [
      "Brand tracking surveys take weeks to run and return a blended average of human opinion. They can't tell you what ChatGPT says when a buyer asks about you.",
      "The agent compares sentiment before and after the campaign in minutes, shows how the language changed on each engine and quotes the answers.",
      "Use it next to brand tracking as a faster signal of what buyers hear when they research with AI.",
    ],
  },
  {
    slug: "ai-traffic-to-pipeline",
    title: "AI traffic to pipeline",
    tagline: "Prove which AI referrals turned into signups",
    category: "reporting-automation",
    stack: ["notra", "chatgpt", "perplexity"],
    prompt:
      "Pull our AI traffic overview for the last 30 days broken down by engine, then list the journeys that ended in a signup. For the top ten converting journeys, show the landing page, the engine and the prompt that likely sent them. Cross-reference against the pages our tracked prompts cite most and tell me which pages earn citations but no traffic, and which earn traffic but aren't cited. End with three pages to double down on.",
    tools: [
      "get_geo_traffic_overview",
      "list_geo_traffic_journeys",
      "get_geo_traffic_journey",
      "list_geo_traffic_pages",
      "list_geo_shelf_sources",
    ],
    body: [
      "Marketing can report that citations are up, but leadership wants to know whether the visitors from those citations sign up.",
      "The agent pulls AI referral traffic by engine, the journeys that converted and their landing pages, then checks them against the pages engines cite.",
      "You get an attribution report for your planning meeting that shows which pages convert and which only collect citations.",
    ],
  },
  {
    slug: "agent-readiness-audit",
    title: "Agent readiness audit",
    tagline: "Find out whether AI agents can use your site",
    category: "strategy-research",
    stack: ["notra", "claude", "github"],
    prompt:
      "Start an agent readiness scan for our domain and wait for it to finish. Walk me through every failed check, explain what an agent hits when it tries to read or act on our site and rank the fixes by impact. For anything that lives in our repo, open a GitHub issue per fix with the exact file or route to change and a short acceptance criterion.",
    tools: [
      "start_geo_agent_readiness_scan",
      "get_geo_agent_readiness",
      "list_integrations",
      "create_github_integration",
    ],
    body: [
      "When a site has no llms.txt, blocks crawlers, renders content only with JavaScript or has unlabelled forms, an agent gives up and recommends someone else.",
      "The agent runs the readiness scan, explains what each failed check breaks for an agent and opens a ticket per fix for your engineers.",
      "Run it once a quarter to keep your site usable for agents that research on a buyer's behalf.",
    ],
  },
  {
    slug: "prompt-set-bias-audit",
    title: "Prompt set bias audit",
    tagline: "Spot self-flattering prompts and fix the blind spots",
    category: "strategy-research",
    stack: ["notra"],
    prompt:
      'Review every prompt we track in Notra for self-flattering bias. Flag prompts that are too narrow, too brand-leading or too aligned with our own positioning to give a fair read on the market. For each flagged prompt, explain the problem and propose a neutral replacement a real buyer would ask. Show me the list, and once I approve, disable the flagged prompts and create the replacements tagged "bias-audit".',
    tools: [
      "list_geo_prompts",
      "list_geo_prompt_result_summaries",
      "update_geo_prompt",
      "create_geo_prompt",
    ],
    body: [
      "Prompts that mention your brand, your category name or your favourite feature report high visibility scores and hide how you compare to competitors.",
      "The agent reviews every tracked prompt for leading wording, explains each one it flags and proposes a neutral replacement.",
      "You find out whether your tracking measures the market or your own marketing.",
    ],
  },
  {
    slug: "launch-post-kit-in-brand-voice",
    title: "Launch post kit in brand voice",
    tagline: "One feature, every channel, sounding like you",
    category: "content-creation",
    stack: ["notra", "linkedin", "x"],
    prompt:
      "We are launching [feature] on [date]. Load our brand identity from Notra, then generate a launch post for the blog, a LinkedIn post and an X thread of five posts, each in our voice and each with a different angle: problem, workflow and outcome. Save all of them as drafts, then schedule the blog post for launch morning and the social posts for two hours later.",
    tools: [
      "get_brand_identity",
      "generate_post",
      "update_post",
      "create_schedule",
      "list_schedules",
    ],
    body: [
      "Launch content tells the same story three ways, and someone usually writes it the night before.",
      "The agent writes a blog post, a LinkedIn post and an X thread from one brief, using the tone, vocabulary and cadence from your brand identity in Notra.",
      "Every piece is saved as a scheduled draft, so on launch day you only review.",
    ],
  },
  {
    slug: "tracking-strategy-builder",
    title: "Tracking strategy builder",
    tagline: "Inspect and rebuild your project's prompts and competitors",
    category: "strategy-research",
    stack: ["notra", "google-search-console"],
    prompt:
      "Inspect our current Notra project: settings, tracked prompts, competitors and which engines are enabled. Pull demand signals from Search Console and propose a defensible tracking strategy: a prompt portfolio split by branded versus non-branded and by funnel stage, a competitor roster with reasoning and the engines worth paying for. Present it as a table. After my sign-off, write the changes to Notra and explain what we will be able to measure that we couldn't before.",
    tools: [
      "get_project",
      "get_geo_settings",
      "list_geo_prompts",
      "list_geo_competitors",
      "suggest_geo_competitors",
      "import_geo_prompts",
      "import_geo_competitors",
      "update_geo_settings",
    ],
    body: [
      "Your tracking setup decides what your reports can tell you. A prompt set built from your business gives better data than a generic starter pack.",
      "The agent reviews your project and Search Console data, proposes prompts split into branded and non-branded and a competitor list with reasons, then writes the changes into Notra.",
      "Each change comes with the reason behind it, so you can see why the project tracks what it tracks.",
    ],
  },
  {
    slug: "answer-gaps-to-linear-issues",
    title: "Answer gaps to Linear issues",
    tagline: "Turn every unanswered prompt into a ticket with an owner",
    category: "reporting-automation",
    stack: ["notra", "linear"],
    prompt:
      'List our GEO content gaps and, for each of the top five, open the latest answer detail to see what the engines say instead of mentioning us. Create one Linear issue per gap in the Content project: title it after the prompt, include the competitor or source the engine cited, the number of prompts affected and a suggested page or update to close it. Label them "geo-gap" and assign to the content team.',
    tools: [
      "list_geo_content_gaps",
      "get_geo_prompt_result_detail",
      "list_geo_shelf_sources",
      "list_integrations",
    ],
    body: [
      "Gaps stay open when nobody owns them, and most content teams plan their work in Linear.",
      "The agent turns each high-impact gap into a Linear issue with the evidence, the source the engine cited instead of you and a suggestion for what to write.",
      "Once the page ships, close the ticket and rerun the scan to confirm the gap is gone.",
    ],
  },
];

export const MCP_USE_CASES: McpUseCase[] = MCP_USE_CASE_WORKFLOWS.map(
  (entry) => ({
    ...entry,
    prompt: `${entry.prompt}\n\n${NOTRA_AGENT_FEEDBACK_PROMPT}`,
  })
);
