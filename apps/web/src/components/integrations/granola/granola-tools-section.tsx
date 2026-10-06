import { IntegrationToolsGrid } from "@/components/integrations/integration-tools-grid";
import { GRANOLA_TOOLS } from "@/constants/granola-integration";

export function GranolaToolsSection() {
  return (
    <IntegrationToolsGrid
      tools={GRANOLA_TOOLS}
      totalCount={GRANOLA_TOOLS.length}
    />
  );
}
