import type { SiteSectionUiPage } from "@/types/ui-route";
import { lazyPage } from "@/utils/lazy-page";

const Analytics = lazyPage(() =>
  import("@/components/sites/pages/site-analytics-page").then((module) => ({
    default: module.SiteAnalyticsPage,
  }))
);
const Deployments = lazyPage(() =>
  import("@/components/sites/pages/site-deployments-page").then((module) => ({
    default: module.SiteDeploymentsPage,
  }))
);
const Domains = lazyPage(() =>
  import("@/components/sites/pages/site-domains-page").then((module) => ({
    default: module.SiteDomainsPage,
  }))
);
const Editor = lazyPage(() =>
  import("@/components/sites/pages/site-editor-page").then((module) => ({
    default: module.SiteEditorPage,
  }))
);
const Integrations = lazyPage(() =>
  import("@/components/sites/pages/site-integrations-page").then((module) => ({
    default: module.SiteIntegrationsPage,
  }))
);
const Settings = lazyPage(() =>
  import("@/components/sites/pages/site-settings-page").then((module) => ({
    default: module.SiteSettingsPage,
  }))
);

export const SITE_SECTION_PAGES: readonly SiteSectionUiPage[] = [
  { section: "analytics", page: Analytics },
  { section: "deployments", page: Deployments },
  { section: "domains", page: Domains },
  { section: "editor", page: Editor },
  { section: "integrations", page: Integrations },
  { section: "settings", page: Settings },
];
