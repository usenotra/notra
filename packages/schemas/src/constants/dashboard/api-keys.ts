import {
  API_ACCEPTED_SCOPES,
  API_GRANULAR_SCOPES,
  API_READ_SCOPES,
} from "@notra/utils/api-scopes";

export const API_KEY_ACCESS_MODE_VALUES = [
  "full",
  "geo",
  "restricted",
] as const;
export const API_KEY_EXPIRATION_VALUES = [
  "never",
  "7d",
  "30d",
  "60d",
  "90d",
] as const;
export const API_KEY_GRANULAR_PERMISSIONS = API_GRANULAR_SCOPES;
export const API_KEY_ACCEPTED_PERMISSIONS = API_ACCEPTED_SCOPES;
export const API_KEY_DEFAULT_SCOPES = API_READ_SCOPES;
