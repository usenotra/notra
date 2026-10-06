import { IntegrationToolsGrid } from "@/components/integrations/integration-tools-grid";
import { LINEAR_TOOLS } from "@/constants/linear-integration";

export function LinearToolsSection() {
  return (
    <IntegrationToolsGrid
      tools={LINEAR_TOOLS}
      totalCount={LINEAR_TOOLS.length}
    />
  );
}
