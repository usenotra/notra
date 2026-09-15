import type { AuthData } from "./auth";
import type { GeoRequestContext } from "./geo-context";

interface ApiBindings {
  readonly [key: string]: unknown;
  APP_URL?: string;
  AUTUMN_SECRET_KEY?: string;
  DATABASE_URL: string;
  FEEDBACK_INGEST_SECRET?: string;
  INTEGRATION_ENCRYPTION_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?: string;
  QSTASH_TOKEN?: string;
  UNKEY_ROOT_KEY: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  UPSTASH_REDIS_REST_URL?: string;
  WORKFLOW_BASE_URL?: string;
  WORKOS_AUTHKIT_DOMAIN?: string;
  WORKOS_API_KEY?: string;
  WORKOS_CLIENT_ID?: string;
}

interface ApiVariables {
  auth: AuthData;
  db: GeoRequestContext["db"];
  geo: GeoRequestContext;
}

export interface ApiEnv {
  Bindings: ApiBindings;
  Variables: ApiVariables;
}
