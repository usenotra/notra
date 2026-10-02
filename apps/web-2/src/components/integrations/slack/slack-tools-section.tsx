import { IntegrationToolsGrid } from "@/components/integrations/integration-tools-grid";
import { SLACK_TOOLS } from "@/constants/slack-integration";

export function SlackToolsSection() {
  return (
    <IntegrationToolsGrid tools={SLACK_TOOLS} totalCount={SLACK_TOOLS.length} />
  );
}
