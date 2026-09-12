import type { ShowcaseCompany } from "~types/showcase";

export const SHOWCASE_COMPANIES = [
  {
    slug: "better-auth",
    name: "Better Auth",
    domain: "better-auth.com",
    description:
      "The most comprehensive authentication framework for TypeScript.",
    url: "https://better-auth.com",
    accentColor: "#000000",
  },
  {
    slug: "cal-com",
    name: "Cal.com",
    domain: "cal.com",
    description:
      "A fully customizable scheduling software for individuals, businesses taking calls and developers building scheduling platforms where users meet users.",
    url: "https://cal.com",
    accentColor: "#292929",
  },
  {
    slug: "databuddy",
    name: "Databuddy",
    domain: "databuddy.cc",
    description:
      "Experience powerful, privacy-first analytics that matches Google Analytics feature-for-feature without compromising user data. Zero cookies required, 100% data ownership, and AI-powered insights to help your business grow while staying compliant.",
    url: "https://databuddy.cc",
    accentColor: "#000000",
  },
  {
    slug: "langfuse",
    name: "Langfuse",
    domain: "langfuse.com",
    description:
      "Traces, evals, prompt management and metrics to debug and improve your LLM application. Integrates with Langchain, OpenAI, LlamaIndex, LiteLLM, and more.",
    url: "https://langfuse.com",
    accentColor: "#E11312",
  },
  {
    slug: "autumn",
    name: "Autumn",
    domain: "useautumn.com",
    description:
      "Autumn is the easiest and most flexible way to set up your app's pricing model. With 3 functions, you can integrate Stripe payments, track usage limits, control feature entitlements, credits, add-ons & much more.",
    url: "https://useautumn.com",
    accentColor: "#9c5bff",
  },
  {
    slug: "neon",
    name: "Neon",
    domain: "neon.tech",
    description:
      "Serverless Postgres built for developers, with instant branching, autoscaling, and modern workflows for database-backed applications.",
    url: "https://neon.tech",
    accentColor: "#37C38F",
  },
  {
    slug: "openclaw",
    name: "OpenClaw",
    domain: "openclaw.ai",
    description:
      "Clears your inbox, sends emails, manages your calendar, checks you in for flights. All from WhatsApp, Telegram, or any chat app you already use.",
    url: "https://openclaw.ai/",
    accentColor: "#F70715",
  },
  {
    slug: "unkey",
    name: "Unkey",
    domain: "unkey.com",
    description:
      "Easily integrate necessary API features like API keys, rate limiting, and usage analytics, ensuring your API is ready to scale.",
    url: "https://unkey.com",
    accentColor: "#000000",
  },
  {
    slug: "pangolin",
    name: "Pangolin",
    domain: "pangolin.net",
    description:
      "Zero trust access to all your infrastructure, self-hosted applications, and SaaS tools. Easy to deploy and scale.",
    url: "https://pangolin.net",
    accentColor: "#4A90D9",
  },
  {
    slug: "onyx",
    name: "Onyx",
    domain: "onyx.app",
    description:
      "The open-source AI enterprise search platform that helps teams find information across all company data.",
    url: "https://onyx.app",
    accentColor: "#1A1A2E",
  },
  {
    slug: "nao-labs",
    name: "nao Labs",
    domain: "getnao.io",
    description:
      "The analytics agent builder for context engineering. Build, evaluate, and deploy reliable analytics agents with your own data stack.",
    url: "https://getnao.io",
    accentColor: "#00C9A7",
  },
  {
    slug: "superagent",
    name: "Superagent",
    domain: "superagent.sh",
    description:
      "We attack your production system to surface data leaks, harmful outputs, and unwanted actions. Fix them before your users encounter them.",
    url: "https://www.superagent.sh",
    accentColor: "#FF6B6B",
  },
  {
    slug: "emdash",
    name: "Emdash",
    domain: "emdash.sh",
    description: "Open-source Agentic Development Environment.",
    url: "https://www.emdash.sh",
    accentColor: "#7C3AED",
  },
  {
    slug: "unsloth-ai",
    name: "Unsloth AI",
    domain: "unsloth.ai",
    description:
      "Open source fine-tuning and reinforcement learning for LLMs. Beginner friendly.",
    url: "https://unsloth.ai",
    accentColor: "#F59E0B",
  },
  {
    slug: "corsair",
    name: "Corsair",
    domain: "corsair.dev",
    description:
      "Corsair enforces a configurable permission layer on every action, so you can delegate work without losing control.",
    url: "https://corsair.dev",
    accentColor: "#E11D48",
  },
  {
    slug: "confident-ai",
    name: "Confident AI",
    domain: "confident-ai.com",
    description:
      "The AI quality layer for engineers, QA teams, and product leaders to build reliable AI.",
    url: "https://www.confident-ai.com",
    accentColor: "#3B82F6",
  },
  {
    slug: "char",
    name: "Char",
    domain: "char.com",
    description:
      "Private, on-device AI notepad that enhances your own notes without bots, cloud recording, or meeting intrusion.",
    url: "https://char.com",
    accentColor: "#10B981",
  },
  {
    slug: "airweave",
    name: "Airweave",
    domain: "airweave.ai",
    description:
      "The open-source data integration platform that connects any data source to any vector database or retrieval system.",
    url: "https://airweave.ai",
    accentColor: "#6366F1",
  },
  {
    slug: "assistant-ui",
    name: "Assistant UI",
    domain: "assistant-ui.com",
    description:
      "Open-source React.js library for building AI chat interfaces across web, React Native, and terminal environments.",
    url: "https://www.assistant-ui.com",
    accentColor: "#111827",
  },
  {
    slug: "cmux",
    name: "cmux",
    domain: "cmux.dev",
    description:
      "A terminal workspace app focused on fast multi-surface workflows, Claude integration, and customizable themes.",
    url: "https://cmux.dev",
    accentColor: "#0F172A",
  },
  {
    slug: "sim",
    name: "Sim",
    domain: "sim.ai",
    description:
      "Open-source platform for building AI agent workflows with integrations, webhooks, and workflow automation.",
    url: "https://www.sim.ai",
    accentColor: "#2563EB",
  },
] as const satisfies readonly ShowcaseCompany[];

const MDX_EXTENSION_REGEX = /\.mdx$/;

export function getShowcaseCompany(slug: string) {
  return SHOWCASE_COMPANIES.find((company) => company.slug === slug);
}

export function getShowcaseEntrySlug(infoPath: string) {
  return infoPath.split("/").pop()?.replace(MDX_EXTENSION_REGEX, "") ?? "";
}
