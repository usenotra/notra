// Shared local-test environment. Throwaway credentials for the Docker Postgres
// and the local worker only — never used in production.
export const TEST_ENCRYPTION_KEY =
  "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="; // base64 of "0123456789abcdef0123456789abcdef" (32 bytes)

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:5433/notra_webhooks";
process.env.WEBHOOK_ENCRYPTION_KEY ??= TEST_ENCRYPTION_KEY;

export const RECEIVER_ORIGIN = "http://127.0.0.1:8788";
