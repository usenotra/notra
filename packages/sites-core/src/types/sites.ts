import type { SITE_DEPLOYMENT_STATUSES } from "@notra/sites-core/constants/sites";

export type SiteDeploymentStatus = (typeof SITE_DEPLOYMENT_STATUSES)[number];
