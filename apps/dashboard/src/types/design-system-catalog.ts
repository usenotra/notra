export interface DesignSystemCatalogLink {
  id: string;
  label: string;
}

export interface DesignSystemCatalogItem extends DesignSystemCatalogLink {
  children?: DesignSystemCatalogLink[];
}

export interface DesignSystemCategory {
  id: string;
  label: string;
  description: string;
  items: DesignSystemCatalogItem[];
}

export interface DesignSystemCatalogEntry extends DesignSystemCatalogLink {
  href: string;
  categoryId: string;
  /** Two-digit index for top-level sections; children inherit none. */
  number: string | null;
  depth: 0 | 1;
  parentLabel: string | null;
}

export interface DesignSystemPageLink {
  href: string;
  label: string;
}
