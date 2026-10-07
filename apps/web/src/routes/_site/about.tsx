import { createFileRoute } from "@tanstack/react-router";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const metadata: Metadata = {
  title: "About Notra",
  description:
    "Learn about Notra, the AI content-generation platform for product and engineering teams.",
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
        subtitle="The AI content platform that turns shipped work into changelogs, launch posts and marketing assets in your team's own voice."
        title={
          <>
            About <span className="text-primary">Notra</span>
          </>
        }
      />

      <div className="flex w-full max-w-3xl flex-col gap-6 px-6">
        <p className="font-sans text-base leading-8 text-[#1E1E1EBF] dark:text-white/70">
          Notra is an AI content-generation platform for product and engineering
          teams. It turns shipped work into changelogs, launch posts, blog
          drafts, marketing assets and social updates that match a team's own
          voice. The product is built for teams that already ship quickly but
          lose time collecting context, asking engineers what changed and
          rewriting rough notes into publishable updates.
        </p>
        <p className="font-sans text-base leading-8 text-[#1E1E1EBF] dark:text-white/70">
          Notra connects to the systems where product work happens, including
          GitHub today and additional workflow tools over time. It uses those
          signals to assemble a timeline of changes, draft content from the
          facts, and preserve brand voice through reusable references and
          writing skills. Teams can review every draft before publishing.
        </p>

        <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-[#1E1E1E14] bg-[#C8B2EE1F] p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="font-display text-lg font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
            Built for agents, too
          </h2>
          <p className="font-sans text-base leading-7 text-[#1E1E1EBF] dark:text-white/70">
            Agents can discover Notra through{" "}
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
            , the public OpenAPI schema and MCP documentation.
          </p>
        </div>
      </div>
    </main>
  );
}
