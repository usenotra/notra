import { parseAsString, useQueryState } from "nuqs";

import { ALL_CATEGORY_ID } from "@/constants/integrations";
import {
  filterIntegrations,
  getFeaturedIntegrations,
} from "@/lib/integrations/helpers";
import type { IntegrationsMarketplaceProps } from "@/types/integrations";

import { IntegrationsView } from "./integrations-view";

export function IntegrationsMarketplace({
  integrations,
  categories,
}: IntegrationsMarketplaceProps) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const [activeCategory, setActiveCategory] = useQueryState(
    "category",
    parseAsString
      .withDefault(ALL_CATEGORY_ID)
      .withOptions({ clearOnDefault: true })
  );

  const featured = getFeaturedIntegrations(integrations);
  const filtered = filterIntegrations(integrations, query, activeCategory);

  const isBrowsing =
    query.trim().length > 0 || activeCategory !== ALL_CATEGORY_ID;
  const showFeatured = !isBrowsing && featured.length > 0;

  return (
    <IntegrationsView
      activeCategory={activeCategory}
      categories={categories}
      featured={featured}
      filtered={filtered}
      integrations={integrations}
      onCategoryChange={(id) => {
        setActiveCategory(id);
      }}
      onQueryChange={(value) => {
        setQuery(value);
      }}
      query={query}
      showFeatured={showFeatured}
    />
  );
}
