import { ALL_CATEGORY_ID } from "@/constants/integrations";
import { getFeaturedIntegrations } from "@/lib/integrations/helpers";
import type { IntegrationsMarketplaceProps } from "@/types/integrations";

import { IntegrationsView } from "./integrations-view";

export function IntegrationsMarketplaceFallback({
  integrations,
  categories,
}: IntegrationsMarketplaceProps) {
  const featured = getFeaturedIntegrations(integrations);

  return (
    <IntegrationsView
      activeCategory={ALL_CATEGORY_ID}
      categories={categories}
      featured={featured}
      filtered={integrations}
      integrations={integrations}
      query=""
      showFeatured={featured.length > 0}
    />
  );
}
