import { INTEGRATION_REFERRAL_SOURCE } from "@/constants/integrations";

export function getIntegrationReferralUrl(url: string): string {
  const referralUrl = new URL(url);
  referralUrl.searchParams.set("ref", INTEGRATION_REFERRAL_SOURCE);
  return referralUrl.toString();
}
