import type {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoGenerationService,
  GeoWorkflowService,
  AgentReadinessNetwork,
  GeoModelService,
  GeoSearchConsoleService,
} from "@notra/geo-core/deps";

export type GeoDashboardRuntime =
  | AgentReadinessNetwork
  | GeoModelService
  | GeoSearchConsoleService
  | GeoContentBillingService
  | GeoEntitlementService
  | GeoFeatureFlagService
  | GeoGenerationService
  | GeoWorkflowService;
