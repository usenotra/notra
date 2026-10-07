"use client";

import { toast } from "sonner";

import { AIOverview } from "../components/ai-overview";
import { AIOverviewCitation } from "../components/ai-overview-citation";
import {
  AIOverviewContent,
  AIOverviewHeading,
  AIOverviewLink,
  AIOverviewList,
  AIOverviewListItem,
  AIOverviewParagraph,
} from "../components/ai-overview-content";
import { AIOverviewHeader } from "../components/ai-overview-header";
import { AIOverviewHighlight } from "../components/ai-overview-highlight";
import { AIOverviewSourceAction } from "../components/ai-overview-source-action";
import {
  GITHUB_VERCEL,
  NEXTJS,
  VERCEL,
  VERCEL_DOCS,
  YOUTUBE_VERCEL,
} from "../constants/vercel-sources";
import type { AIOverviewSource } from "../types/google-ai-overview";

const renderSourceAction = (source: AIOverviewSource) => (
  <AIOverviewSourceAction
    onClick={() => toast("3 dot button clicked", { description: source.title })}
  />
);

export default function GoogleAIOverviewDemo() {
  return (
    <AIOverview className="p-6">
      <AIOverviewHeader />
      <AIOverviewContent>
        <AIOverviewParagraph>
          <AIOverviewLink href="https://vercel.com">Vercel</AIOverviewLink> is{" "}
          <AIOverviewHighlight active>
            a cloud platform that helps developers build, deploy, and host fast
            modern websites and web applications
          </AIOverviewHighlight>
          .
          <AIOverviewCitation
            renderSourceAction={renderSourceAction}
            sources={[VERCEL, VERCEL_DOCS]}
          />
        </AIOverviewParagraph>
        <AIOverviewHeading>What Vercel Does</AIOverviewHeading>
        <AIOverviewList>
          <AIOverviewListItem>
            <strong>Easy Hosting:</strong>{" "}
            <AIOverviewHighlight>
              It handles the servers and infrastructure so you can launch
              user-facing websites quickly.
            </AIOverviewHighlight>
            <AIOverviewCitation
              renderSourceAction={renderSourceAction}
              sources={[VERCEL, VERCEL_DOCS]}
            />
          </AIOverviewListItem>
          <AIOverviewListItem>
            <strong>Git Integration:</strong>{" "}
            <AIOverviewHighlight>
              It connects to GitHub, GitLab, or Bitbucket and deploys a live
              version of your site every time you push changes.
            </AIOverviewHighlight>
            <AIOverviewCitation
              renderSourceAction={renderSourceAction}
              sources={[YOUTUBE_VERCEL, GITHUB_VERCEL, VERCEL_DOCS]}
            />
          </AIOverviewListItem>
          <AIOverviewListItem>
            <strong>Preview Links:</strong>{" "}
            <AIOverviewHighlight>
              Every pull request gets a unique preview URL so teams can review
              work before it goes public.
            </AIOverviewHighlight>
            <AIOverviewCitation
              renderSourceAction={renderSourceAction}
              sources={[GITHUB_VERCEL, VERCEL_DOCS]}
            />
          </AIOverviewListItem>
          <AIOverviewListItem>
            <strong>Global Speed:</strong>{" "}
            <AIOverviewHighlight>
              A global CDN serves your site from servers close to your users.
            </AIOverviewHighlight>
            <AIOverviewCitation
              renderSourceAction={renderSourceAction}
              sources={[VERCEL_DOCS]}
            />
          </AIOverviewListItem>
        </AIOverviewList>
        <AIOverviewHeading>Key Features</AIOverviewHeading>
        <AIOverviewList>
          <AIOverviewListItem>
            <strong>Framework Support:</strong> It supports React, Vue, Svelte,
            and Astro, and is the creator and primary host of Next.js.
            <AIOverviewCitation
              renderSourceAction={renderSourceAction}
              sources={[NEXTJS, VERCEL]}
            />
          </AIOverviewListItem>
          <AIOverviewListItem>
            <strong>Serverless Functions:</strong> It runs backend code tied to
            HTTP requests without a full-time server.
          </AIOverviewListItem>
          <AIOverviewListItem>
            <strong>AI Tools:</strong> It makes v0, which generates website code
            from text prompts.
            <AIOverviewCitation
              renderSourceAction={renderSourceAction}
              sources={[VERCEL, NEXTJS, YOUTUBE_VERCEL]}
            />
          </AIOverviewListItem>
        </AIOverviewList>
      </AIOverviewContent>
    </AIOverview>
  );
}
