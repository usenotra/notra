import { AIOverview } from "../components/ai-overview";
import {
  AIOverviewContent,
  AIOverviewHeading,
  AIOverviewLink,
  AIOverviewList,
  AIOverviewListItem,
  AIOverviewParagraph,
} from "../components/ai-overview-content";

export default function AIOverviewContentExample() {
  return (
    <AIOverview className="p-6" collapsible={false}>
      <AIOverviewContent>
        <AIOverviewParagraph>
          <AIOverviewLink href="https://nextjs.org">Next.js</AIOverviewLink> is
          a React framework made by Vercel.
        </AIOverviewParagraph>
        <AIOverviewHeading>Why teams pick it</AIOverviewHeading>
        <AIOverviewList>
          <AIOverviewListItem>
            <strong>Routing:</strong> File-based routes with layouts.
          </AIOverviewListItem>
          <AIOverviewListItem>
            <strong>Rendering:</strong> Static, dynamic and streamed pages.
          </AIOverviewListItem>
        </AIOverviewList>
      </AIOverviewContent>
    </AIOverview>
  );
}
