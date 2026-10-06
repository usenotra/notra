import { IntegrationToolsGrid } from "@/components/integrations/integration-tools-grid";
import { GITHUB_TOOLS } from "@/constants/github-integration";

export function GithubToolsSection() {
  return (
    <IntegrationToolsGrid
      tools={GITHUB_TOOLS}
      totalCount={GITHUB_TOOLS.length}
    />
  );
}
