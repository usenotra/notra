import type { ApiGranularScope } from "../api-scopes";

export interface OAuthConsentOption {
  claim: string;
  type: "enum";
  label: string;
  choices: { value: string; label: string }[];
}

export interface OAuthConsentGrant {
  organizationId: string;
  organizationSource: "local" | "workos";
  scopes: ApiGranularScope[];
}
