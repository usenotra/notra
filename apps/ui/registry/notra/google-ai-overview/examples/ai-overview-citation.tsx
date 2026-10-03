import { AIOverview } from "../components/ai-overview";
import { AIOverviewCitation } from "../components/ai-overview-citation";
import { AIOverviewParagraph } from "../components/ai-overview-content";
import {
  GITHUB_VERCEL,
  NEXTJS,
  VERCEL,
  YOUTUBE_VERCEL,
} from "../constants/vercel-sources";

export default function AIOverviewCitationExample() {
  return (
    <AIOverview className="p-6" collapsible={false}>
      <AIOverviewParagraph>
        One source
        <AIOverviewCitation sources={[VERCEL]} />
      </AIOverviewParagraph>
      <AIOverviewParagraph>
        Several sources
        <AIOverviewCitation sources={[GITHUB_VERCEL, VERCEL, NEXTJS]} />
      </AIOverviewParagraph>
      <AIOverviewParagraph>
        With meta
        <AIOverviewCitation sources={[YOUTUBE_VERCEL, VERCEL]} />
      </AIOverviewParagraph>
    </AIOverview>
  );
}
