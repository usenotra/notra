export const LOCAL_ENVIRONMENT = {
  NODE_ENV: "production",
  CI: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  DO_NOT_TRACK: "1",
  DATABASE_URL:
    "postgresql://notra_test:notra_test@127.0.0.1:5432/notra_migration_test",
  WORKOS_API_KEY: "sk_test_migration_placeholder",
  WORKOS_CLIENT_ID: "client_migration_placeholder",
  WORKOS_COOKIE_PASSWORD: "migration-local-only-cookie-password-000000000000",
  WORKOS_REDIRECT_URI: "http://127.0.0.1:3000/callback",
  INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  APP_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  DEV_AUTH_ENABLED: "false",
};

export const BUILD_CACHE_PATHS = [
  ".next",
  ".output",
  "dist",
  ".tanstack",
  ".turbo",
];
