import { createFileRoute } from "@tanstack/react-router";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const metadata: Metadata = {
  title: "About Notra",
  description:
    "Notra is a GEO tool that tracks how AI engines answer your buyers' questions, which competitors they name and which AI agents visit your site.",
  alternates: pageAlternates(`${SITE_URL}/about`),
};

export const Route = createFileRoute("/_site/about")({
  head: () => buildHead(metadata),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="flex w-full flex-col items-center gap-12 pb-20 md:gap-16 md:pb-24">
      <MarketingHeroWash
        subtitle="Notra is a GEO tool that shows how ChatGPT, Claude, Gemini and Perplexity answer the questions your buyers ask and whether your brand is in those answers."
        title={
          <>
            About <span className="text-primary">Notra</span>
          </>
        }
      />

      <div className="flex w-full max-w-3xl flex-col gap-6 px-6">
        <p className="font-sans text-base leading-8 text-[#1E1E1EBF] dark:text-white/70">
          When someone asks an AI assistant which tool to buy, the answer names
          a few brands and links to a few pages. Notra sends the questions your
          buyers ask to each engine on a schedule, keeps every answer and
          records whether you were mentioned, in which position and which
          competitors the engine named instead.
        </p>
        <p className="font-sans text-base leading-8 text-[#1E1E1EBF] dark:text-white/70">
          Notra also tracks the AI agents that visit your website, so you can
          tell a training crawler apart from an assistant that read your page
          while answering someone and from a person who clicked through from an
          AI answer. Where engines answer without mentioning you, Notra ranks
          the gap by how winnable it looks and drafts a guide, listicle or
          comparison in your brand voice that you review before it goes live.
        </p>
        <p className="font-sans text-base leading-8 text-[#1E1E1EBF] dark:text-white/70">
          Notra started as a tool that turned shipped work into changelogs and
          launch posts. That writer still runs inside the product, and it uses
          the same brand identity when it drafts articles for the gaps you want
          to close.
        </p>

        <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-[#1E1E1E14] bg-[#C8B2EE1F] p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="font-display text-lg font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
            Built for agents, too
          </h2>
          <p className="font-sans text-base leading-7 text-[#1E1E1EBF] dark:text-white/70">
            AI agents can find Notra through{" "}
            <a
              className="text-primary hover:text-primary-hover font-medium underline underline-offset-2"
              href="/llms.txt"
            >
              llms.txt
            </a>
            ,{" "}
            <a
              className="text-primary hover:text-primary-hover font-medium underline underline-offset-2"
              href="/.well-known/agent.json"
            >
              agent.json
            </a>
            , the public OpenAPI schema and the MCP server. The{" "}
            <a
              className="text-primary hover:text-primary-hover font-medium underline underline-offset-2"
              href="/agent"
            >
              agent page
            </a>{" "}
            lists every endpoint and discovery file.
          </p>
        </div>
      </div>
    </main>
  );
}
