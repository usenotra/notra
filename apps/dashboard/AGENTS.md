# Dashboard

This application uses TanStack Start, Vite, and Nitro. Route registration lives in
`src/routes` and `src/router.tsx`; `src/app` contains retained feature components
and request handlers imported by those routes, not filesystem route registration.

Use `@/lib/navigation`, `@/components/framework/link`,
`@/components/framework/image`, and `@/utils/lazy-component` directly. Localization
uses `use-intl` in components and `@/lib/i18n/server` on the server.

Run `bun run test`, `bun run check-types`, and `bun run build` from this directory.
See `docs/migration-testing.md` for isolated browser and data checks. Do not use
production credentials or customer data for verification.
