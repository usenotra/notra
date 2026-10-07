# Notra

Content Engine for your company so you can focus on what matters!

The dashboard runs on TanStack Start with Vite and Nitro. From the repository
root, use `bun run dev --filter=dashboard`. From this directory, run `bun run test`,
`bun run check-types`, and `bun run build`; `bun run start` serves the standalone
production output.

Native routes live in `src/routes`. Retained feature components and request
handlers under `src/app` are imported explicitly; that directory does not register
routes automatically. Localization uses `use-intl` and the dashboard server helpers.
