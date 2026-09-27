import { AIOverview } from "../components/ai-overview";
import { AIOverviewCitation } from "../components/ai-overview-citation";
import { AIOverviewParagraph } from "../components/ai-overview-content";
import { AIOverviewHighlight } from "../components/ai-overview-highlight";
import { VERCEL, VERCEL_DOCS } from "../constants/vercel-sources";

export default function AIOverviewHighlightExample() {
  return (
    <AIOverview className="p-6" collapsible={false}>
      <AIOverviewParagraph>
        <AIOverviewHighlight active>
          Vercel is a cloud platform for building and hosting web apps
        </AIOverviewHighlight>
        . Hover the chip to highlight the next claim:{" "}
        <AIOverviewHighlight>
          every pull request gets its own preview URL.
        </AIOverviewHighlight>
        <AIOverviewCitation sources={[VERCEL, VERCEL_DOCS]} />
      </AIOverviewParagraph>
    </AIOverview>
  );
}
