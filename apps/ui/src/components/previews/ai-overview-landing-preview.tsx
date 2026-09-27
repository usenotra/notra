import { AIOverview } from "../../../registry/notra/google-ai-overview/components/ai-overview";
import { AIOverviewCitation } from "../../../registry/notra/google-ai-overview/components/ai-overview-citation";
import { AIOverviewParagraph } from "../../../registry/notra/google-ai-overview/components/ai-overview-content";
import { AIOverviewHeader } from "../../../registry/notra/google-ai-overview/components/ai-overview-header";
import { AIOverviewHighlight } from "../../../registry/notra/google-ai-overview/components/ai-overview-highlight";
import {
  VERCEL,
  VERCEL_DOCS,
} from "../../../registry/notra/google-ai-overview/constants/vercel-sources";

export default function AIOverviewLandingPreview() {
  return (
    <AIOverview className="p-5" collapsible={false}>
      <AIOverviewHeader />
      <AIOverviewParagraph>
        Vercel is{" "}
        <AIOverviewHighlight active>
          a cloud platform for building, deploying and hosting fast web
          applications
        </AIOverviewHighlight>
        .
        <AIOverviewCitation preview={false} sources={[VERCEL, VERCEL_DOCS]} />
      </AIOverviewParagraph>
    </AIOverview>
  );
}
