export const PAID_ORG = "org_paid";
export const FREE_ORG = "org_free";
export const MODEL = "anthropic/claude-sonnet-4.6";
export const CREDIT_TTL_MS = 30_000;
export const plans = { [PAID_ORG]: "paid", [FREE_ORG]: "free" } as const;
