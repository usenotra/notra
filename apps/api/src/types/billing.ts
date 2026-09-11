export interface GeoEntitlementCheckInput {
  organizationId: string;
  secretKey: string;
}

export type GeoEntitlementChecker = (
  input: GeoEntitlementCheckInput
) => Promise<boolean>;

export interface GeoEntitlementMiddlewareOptions {
  checkEntitlement?: GeoEntitlementChecker;
}

export interface SubscriptionAccessInput {
  organizationId: string;
  secretKey: string;
}

interface BillingSubscription {
  addOn?: boolean | null;
  planId: string;
  status: string;
}

export interface SubscriptionBillingChecker {
  getCustomer: (
    input: SubscriptionAccessInput
  ) => Promise<{ subscriptions: BillingSubscription[] }>;
  checkCredits: (input: SubscriptionAccessInput) => Promise<boolean>;
}

export interface SubscriptionMiddlewareOptions {
  billing?: SubscriptionBillingChecker;
}
