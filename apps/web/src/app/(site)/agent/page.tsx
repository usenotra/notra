import type { Metadata } from "next";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { apiUrl, buildAgentJson, siteUrl } from "@/utils/agent-metadata";

export const metadata: Metadata = {
  title: "Notra Agent Interface",
  description:
    "Explore Notra's generative engine optimization (GEO) tools for AI visibility, competitor share of voice, and content gaps through the API and MCP.",
};

export default function AgentPage() {
  const agent = buildAgentJson();

  return (
    <main className="flex w-full flex-col items-center gap-8 pb-28 antialiased [font-synthesis:none]">
      <MarketingHeroWash
        subtitle="Notra helps you track and improve your visibility in AI answers. Monitor brand mentions across ChatGPT, Claude, Gemini, and Perplexity, compare your share of voice with competitors, and turn content gaps into articles in your brand voice."
        title={
          <>
            Notra <span className="text-primary">Agent</span> Interface
          </>
        }
      />
      <section className="mx-auto grid w-[min(100%-3rem,56rem)] gap-4 text-sm md:grid-cols-2">
        <div className="rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-6 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
          <h2 className="font-sans text-lg font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
            Discovery
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[#1E1E1E99] dark:text-white/60">
            <li>Agent JSON: {siteUrl("/.well-known/agent.json")}</li>
            <li>Agent Card: {siteUrl("/.well-known/agent-card.json")}</li>
            <li>API Catalog: {siteUrl("/.well-known/api-catalog")}</li>
            <li>
              Integration Surfaces: {siteUrl("/.well-known/integrations.json")}
            </li>
            <li>Auth guide: {siteUrl("/auth.md")}</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-6 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
          <h2 className="font-sans text-lg font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
            Endpoints
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[#1E1E1E99] dark:text-white/60">
            <li>API: {apiUrl()}</li>
            <li>OpenAPI: {apiUrl("/openapi.json")}</li>
            <li>MCP: {agent.mcp.streamable_http}</li>
            <li>NLWeb ask: {siteUrl("/ask")}</li>
          </ul>
        </div>
      </section>
      <pre className="bg-background overflow-auto rounded-2xl border border-[#1E1E1E14] p-5 font-mono text-xs leading-6 text-[#1E1E1E] dark:border-white/10 dark:text-white/80">
        {JSON.stringify(agent, null, 2)}
      </pre>
    </main>
  );
}
