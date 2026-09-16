import {
  ChartLineData01Icon,
  Compass01Icon,
  QuillWrite01Icon,
  RepeatIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons";

import type {
  McpUseCase,
  McpUseCaseCategory,
  McpUseCaseCategoryFilter,
} from "@/types/mcp-use-cases";
import { DOCS_URL } from "@/utils/urls";

export const MCP_USE_CASES_PATH = "/mcp/use-cases";

export const MCP_USE_CASES_ALL_CATEGORY_ID = "all";

export const MCP_USE_CASES_RELATED_LIMIT = 3;

export const MCP_USE_CASES_BUILD_YOUR_OWN_URL = `${DOCS_URL}/devtools/mcp`;

export const MCP_USE_CASES_SHARE_HREF = "/contact";

export const MCP_USE_CASES_EYEBROW = "MCP use cases";

export const MCP_USE_CASES_EYEBROW_ICON = WorkflowSquare01Icon;

export const MCP_USE_CASES_SUBHEAD =
  "Copy a prompt, paste it into Claude Code, Cursor or Codex, and let your agent run the whole workflow against your Notra workspace.";

export const MCP_USE_CASES_PRIMARY_CTA = "Get started with Notra MCP";

export const MCP_USE_CASES_SECONDARY_CTA = "Share your workflow";

export const MCP_USE_CASES_PAGE_TITLE = "Notra MCP Use Cases";

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

export const MCP_USE_CASES: McpUseCase[] = [
  {
    slug: "search-console-to-prompt-discovery",
    title: "Search Console to Prompt Discovery",
    tagline: "Turn high-potential Search Console queries into tracked prompts",
    category: "strategy-research",
    stack: ["notra", "google-search-console"],
    prompt:
      "Pull the last 90 days of Google Search Console queries for our site and keep the question-style ones with real impressions but a weak position. Compare them against the prompts we already track in Notra, create the strongest 20 as new GEO prompts tagged “gsc-discovery”, and disable any existing prompt that has had zero mentions across every engine for the last 30 days. Finish with a table of what you added, what you paused, and why.",
    tools: [
      "list_geo_prompts",
      "list_geo_prompt_result_summaries",
      "create_geo_prompt",
      "import_geo_prompts",
      "update_geo_prompt",
    ],
    body: [
      "Most prompt sets are educated guesses about what people might ask. Search Console already knows what they actually type, and the question-style queries hiding in there are the ones AI assistants are most likely to be answering.",
      "This wires the two sources together: high-intent questions pulled from Search Console, created as Notra prompts based on real search demand, and an automatic cleanup for prompts that stopped earning mentions.",
      "The prompt set stops being a hunch and starts reflecting what people search, refreshed on whatever cadence you run the agent.",
    ],
  },
  {
    slug: "weekly-ai-visibility-brief",
    title: "Weekly AI Visibility Brief",
    tagline: "Your AI search week in review, posted straight to Slack",
    category: "reporting-automation",
    stack: ["notra", "slack"],
    prompt:
      "What happened to our AI visibility last week? Use Notra to pull overall mention rate per engine compared to the prior week, the sentiment score and any notable shifts by engine, share of voice against our top three competitors, and the five prompts with the biggest gains and drops. Flag any competitor that moved more than five points. Write it as a short brief with one recommended focus for the week and post the summary to #marketing.",
    tools: [
      "get_geo_visibility_overview",
      "get_geo_visibility_timeseries",
      "get_geo_changes",
      "get_geo_sentiment",
      "get_geo_competitor_share",
    ],
    body: [
      "One prompt, a full AI visibility analysis, summarized into a weekly brief and delivered where the team already reads. No dashboard tour, no screenshots.",
      "The agent pulls mention rates across ChatGPT, Perplexity, Gemini, Claude and Google AI Overviews, compares week over week, surfaces the prompts driving the biggest changes, and flags competitor moves worth reacting to.",
      "Run it on Monday morning and the team starts the week knowing exactly where visibility moved and what to do about it.",
    ],
  },
  {
    slug: "find-your-ai-model-blind-spot",
    title: "Find Your AI Model Blind Spot",
    tagline: "Diagnose exactly why your visibility differs across engines",
    category: "analytics-monitoring",
    stack: ["notra", "chatgpt", "perplexity"],
    prompt:
      "Get our mention rate per answer engine for the last 30 days and identify the engine where we are strongest and the one where we are weakest. For both engines, list the sources those answers cite most often and check whether our own domain appears. Compare the two: which source types each engine leans on, which domains we appear in on the strong engine but not the weak one, and whether the gap is a content problem or a distribution problem. Return a diagnosis and three to five concrete actions to close it.",
    tools: [
      "get_geo_visibility_overview",
      "list_geo_prompt_result_summaries",
      "get_geo_prompt_result_detail",
      "list_geo_shelf_sources",
    ],
    body: [
      "Visibility in AI search is not one number. You can be prominent on Perplexity and invisible on ChatGPT for the same questions, and the reason is usually traceable to which sources each engine trusts.",
      "Knowing you have a gap is not enough. Knowing which engine has the gap, and which domains that engine cites that you are missing from, gives you a fix you can actually execute.",
      "This runs that diagnosis and returns a specific set of actions: which source types to earn coverage from, which domains to target, and whether to write or to distribute.",
    ],
  },
  {
    slug: "content-gap-to-published-post",
    title: "Content Gap to Published Post",
    tagline: "Turn the questions AI can't answer about you into a draft",
    category: "content-creation",
    stack: ["notra", "claude"],
    prompt:
      "List our open GEO content gaps and pick the one with the most prompts behind it. Plan a content brief for it, show me the outline, and once I approve, generate the post in our brand voice as a draft. Link the draft back to the gap so we can measure whether mentions improve after it goes live.",
    tools: [
      "list_geo_content_gaps",
      "plan_geo_content_brief",
      "approve_geo_content_brief",
      "generate_post",
      "update_post",
    ],
    body: [
      "Content gaps are the prompts where AI engines answer with competitors or say nothing at all. Every one of them is a page you have not written yet.",
      "This turns the gap list into a working pipeline: the agent ranks gaps by how many prompts they cover, plans a brief with the angle and structure, waits for your sign-off, and writes the draft in your brand voice.",
      "The draft stays tied to the gap it came from, so the next scan tells you whether the page actually moved the needle.",
    ],
  },
  {
    slug: "changelog-from-merged-prs",
    title: "Changelog from Merged PRs",
    tagline: "Ship the week's changelog without opening the editor",
    category: "content-creation",
    stack: ["notra", "github"],
    prompt:
      "Check that our GitHub integration is connected, then generate a changelog post from everything merged this week. Group it by feature, fix and improvement, keep the brand voice, and skip internal refactors. Show me the draft, and once I say go, schedule it for Thursday 10:00 in our timezone.",
    tools: [
      "list_integrations",
      "get_brand_identity",
      "generate_post",
      "update_post",
      "create_schedule",
    ],
    body: [
      "The changelog is the one piece of content engineering teams always mean to write and rarely do. The raw material already exists in merged pull requests.",
      "This packages the whole loop: the agent reads the week from GitHub through Notra, drafts a changelog that reads like your brand rather than a commit log, and queues it for the slot you choose.",
      "Run it every week and the changelog stops being a chore and starts being a habit your users can rely on.",
    ],
  },
  {
    slug: "competitor-share-of-voice-watch",
    title: "Competitor Share of Voice Watch",
    tagline: "Know when a competitor starts winning your prompts",
    category: "analytics-monitoring",
    stack: ["notra", "chatgpt", "gemini"],
    prompt:
      "Suggest competitors we are not tracking yet based on who appears in our prompt answers, and add the two that show up most. Then pull share of voice for all tracked competitors over the last 30 days versus the previous 30. For any competitor that gained more than three points, open their detail, list the prompts where they overtook us, and summarize what those answers say about them that they don't say about us.",
    tools: [
      "suggest_geo_competitors",
      "upsert_geo_competitor",
      "get_geo_competitor_share",
      "get_geo_competitor_detail",
      "list_geo_prompt_result_summaries",
    ],
    body: [
      "Share of voice in AI answers moves faster than in search rankings. A competitor can go from absent to recommended in a fortnight because one page got cited by the right engine.",
      "This keeps the competitor roster honest by adding brands that already appear in your answers, then watches for the ones gaining ground and explains why in the words the engines use.",
      "You get an early warning and the exact prompts to fight back on, instead of finding out from a lost deal.",
    ],
  },
  {
    slug: "campaign-sentiment-before-and-after",
    title: "Campaign Sentiment Before and After",
    tagline: "See whether your campaign changed how AI describes your brand",
    category: "analytics-monitoring",
    stack: ["notra", "slack"],
    prompt:
      "Compare our GEO sentiment for the 30 days before [campaign start] with the 30 days after. Pull the overall score for each period, the sentiment analysis with the phrases AI uses to describe us, and the strongest evidence quotes on both sides. Tell me whether the language shifted toward our campaign messaging, which engines responded most, and which did not move at all. Post a before-and-after summary to #brand.",
    tools: [
      "get_geo_sentiment",
      "get_geo_sentiment_analysis",
      "list_geo_sentiment_evidence",
      "get_geo_snapshot",
    ],
    body: [
      "Brand tracking surveys take weeks to field and return a blended average of human perception. They tell you nothing about what ChatGPT says when a buyer asks about you.",
      "This gives you the AI search equivalent in minutes: before and after sentiment, the specific language shift engine by engine, and the quotes that prove it.",
      "It doesn't replace brand tracking. It complements it with a faster signal that is tied directly to what buyers hear when they research with AI.",
    ],
  },
  {
    slug: "ai-traffic-to-pipeline",
    title: "AI Traffic to Pipeline",
    tagline: "Prove which AI referrals actually turned into signups",
    category: "reporting-automation",
    stack: ["notra", "chatgpt", "perplexity"],
    prompt:
      "Pull our AI traffic overview for the last 30 days broken down by engine, then list the journeys that ended in a signup. For the top ten converting journeys, show the landing page, the engine, and the prompt that likely sent them. Cross-reference against the pages our tracked prompts cite most and tell me which pages earn citations but no traffic, and which earn traffic but aren't cited. End with three pages to double down on.",
    tools: [
      "get_geo_traffic_overview",
      "list_geo_traffic_journeys",
      "get_geo_traffic_journey",
      "list_geo_traffic_pages",
      "list_geo_shelf_sources",
    ],
    body: [
      "AI visibility wins are easy to claim and harder to prove. Marketing says citations are up; leadership asks whether anyone arriving from those citations signs up.",
      "This closes the loop: AI referral traffic by engine, the journeys that converted, and the pages behind them, cross-referenced with what the engines actually cite.",
      "The output is an attribution report you can defend in a planning meeting. Pages that convert get investment, pages that only look good get cut.",
    ],
  },
  {
    slug: "agent-readiness-audit",
    title: "Agent Readiness Audit",
    tagline: "Find out whether AI agents can actually use your site",
    category: "strategy-research",
    stack: ["notra", "claude", "github"],
    prompt:
      "Start an agent readiness scan for our domain and wait for it to finish. Walk me through every failed check, explain what an agent hits when it tries to read or act on our site, and rank the fixes by impact. For anything that lives in our repo, open a GitHub issue per fix with the exact file or route to change and a short acceptance criterion.",
    tools: [
      "start_geo_agent_readiness_scan",
      "get_geo_agent_readiness",
      "list_integrations",
      "create_github_integration",
    ],
    body: [
      "Agents don't browse the way people do. Missing llms.txt, blocked crawlers, JavaScript-only content and unlabelled forms all mean an agent gives up and recommends someone else.",
      "This runs the readiness scan, translates every failed check into what actually goes wrong for an agent, and turns the fixes into tickets your engineers can pick up.",
      "Run it once a quarter and your site stays usable for the buyers who never see it with their own eyes.",
    ],
  },
  {
    slug: "prompt-set-bias-audit",
    title: "Prompt Set Bias Audit",
    tagline: "Spot self-flattering prompts and fix the blind spots",
    category: "strategy-research",
    stack: ["notra"],
    prompt:
      "Review every prompt we track in Notra for self-flattering bias. Flag prompts that are too narrow, too brand-leading, or too aligned with our own positioning to give a fair read on the market. For each flagged prompt, explain the problem and propose a neutral replacement a real buyer would ask. Show me the list, and once I approve, disable the flagged prompts and create the replacements tagged “bias-audit”.",
    tools: [
      "list_geo_prompts",
      "list_geo_prompt_result_summaries",
      "update_geo_prompt",
      "create_geo_prompt",
    ],
    body: [
      "Prompts that mention your brand, your category name, or your favourite feature will report flattering visibility scores while hiding the competitive reality the project was supposed to surface.",
      "This audits the full prompt set: every tracked prompt reviewed for leading framing, the narrow ones flagged with reasoning, and neutral replacements that close the blind spots.",
      "No extra tooling, just an honest read on whether your tracking measures the market or measures your own marketing.",
    ],
  },
  {
    slug: "launch-post-kit-in-brand-voice",
    title: "Launch Post Kit in Brand Voice",
    tagline: "One feature, every channel, sounding like you",
    category: "content-creation",
    stack: ["notra", "linkedin", "x"],
    prompt:
      "We are launching [feature] on [date]. Load our brand identity from Notra, then generate a launch post for the blog, a LinkedIn post, and an X thread of five posts, each in our voice and each with a different angle: problem, workflow, and outcome. Save all of them as drafts, then schedule the blog post for launch morning and the social posts for two hours later.",
    tools: [
      "get_brand_identity",
      "generate_post",
      "update_post",
      "create_schedule",
      "list_schedules",
    ],
    body: [
      "Launch content is the same story told three ways, and it usually gets written at midnight the night before by whoever is still awake.",
      "This generates the whole kit from a single brief: long-form for the blog, a tight LinkedIn post, and a thread for X, all pulling tone, vocabulary and cadence from your brand identity in Notra.",
      "Everything lands as drafts on a schedule, so launch day is a review, not a writing session.",
    ],
  },
  {
    slug: "tracking-strategy-builder",
    title: "Tracking Strategy Builder",
    tagline: "Inspect and rebuild your project's prompts and competitors",
    category: "strategy-research",
    stack: ["notra", "google-search-console"],
    prompt:
      "Inspect our current Notra project: settings, tracked prompts, competitors, and which engines are enabled. Pull demand signals from Search Console and propose a defensible tracking strategy: a prompt portfolio split by branded versus non-branded and by funnel stage, a competitor roster with reasoning, and the engines worth paying for. Present it as a table. After my sign-off, write the changes to Notra and explain what we will be able to measure that we couldn't before.",
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
      "AI visibility tracking is a new category, and the measurement setup matters as much as the decisions it informs. A prompt set that mirrors the business beats a generic starter pack every time.",
      "This runs the full strategy build: an intake across your current project and Search Console, a prescriptive prompt portfolio split by branded and non-branded, a competitor roster with reasoning, and the changes written straight into Notra.",
      "The reasoning behind every decision comes out alongside the config, so the project doesn't just track the right things, it can explain why.",
    ],
  },
  {
    slug: "answer-gaps-to-linear-issues",
    title: "Answer Gaps to Linear Issues",
    tagline: "Turn every unanswered prompt into a ticket with an owner",
    category: "reporting-automation",
    stack: ["notra", "linear"],
    prompt:
      "List our GEO content gaps and, for each of the top five, open the latest answer detail to see what the engines say instead of mentioning us. Create one Linear issue per gap in the Content project: title it after the prompt, include the competitor or source the engine cited, the number of prompts affected, and a suggested page or update to close it. Label them “geo-gap” and assign to the content team.",
    tools: [
      "list_geo_content_gaps",
      "get_geo_prompt_result_detail",
      "list_geo_shelf_sources",
      "list_integrations",
    ],
    body: [
      "A gap report nobody owns is a gap that stays open. The content team works out of Linear, not out of a GEO dashboard.",
      "This moves the work to where it gets done: each high-impact gap becomes an issue with the evidence attached, the source that beat you, and a concrete suggestion for what to write.",
      "Close the ticket, rerun the scan, and watch the gap disappear from the next report.",
    ],
  },
];
