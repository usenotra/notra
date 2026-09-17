import type { ApiGranularScope } from "../api-scopes";

export interface OAuthConsentWorkspace {
  id: string;
  name: string;
}

export interface OAuthConsentOption {
  claim: string;
  type: "enum";
  label: string;
  choices: { value: string; label: string }[];
}

export interface OAuthConsentGrant {
  organizationId: string;
  scopes: ApiGranularScope[];
}
