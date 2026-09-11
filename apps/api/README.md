To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open the local URL Bun prints on startup

The dev server runs with Bun so the `fetch` export is actually served.

## Effect migration layering

- **Routes** stay thin: decode OpenAPI input, read auth/org from Hono context, call a program, map typed failures to HTTP.
- **Programs** (`src/programs/`) hold domain workflows with `Effect.fn` and `Schema.TaggedError`; they must not know about HTTP status codes.
- **Services** (`src/lib/`) expose `Context.Service` tags and `Layer` implementations for adapters (QStash, dashboard, billing, etc.).
- **Runtime** (`src/runtime/run-program.ts`) runs programs at the HTTP boundary: infrastructure defects die, domain errors return as `Effect.result`.
- **HTTP helpers** (`src/http/map-error.ts`) map tagged domain errors to JSON responses; routes opt in per domain.
