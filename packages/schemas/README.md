# @notra/schemas

Shared application validation contracts for the dashboard/oRPC backend and public API.
Import individual domains; there is no root barrel.

```ts
import { createSkillSchema } from "@notra/schemas/dashboard/skills";
import { createSkillRequestSchema } from "@notra/schemas/api/skills";
import { skillNameSchema } from "@notra/schemas/shared/skills";
```

## Ownership

- `src/schemas/shared`: transport-independent rules used by both applications.
- `src/schemas/dashboard`: form, oRPC, webhook, and dashboard workflow contracts.
- `src/schemas/api`: public REST contracts with OpenAPI metadata.
- `src/constants`, `src/types`, `src/utils`: validation dependencies grouped by domain.

Keep application services, UI components, authentication, and transport error handling
out of this package. For example, upload validators live here but throwing an oRPC
error remains in the dashboard's upload helper. Never import `apps/*` or their `@/`
aliases into this package. Dashboard/browser consumers must not import API entrypoints.

Existing domain packages (`@notra/ai`, `@notra/geo-core`,
`@notra/content-generation`, and `@notra/db`) still own their reusable domain
schemas. This package composes those schemas rather than copying them or introducing
a reverse dependency. Drizzle table definitions are persistence schemas, not app
validation contracts, and remain in `@notra/db`.

## Why Zod, not an Effect migration?

The public API uses `@hono/zod-openapi`; existing consumers also rely on Zod schema
composition, inferred input/output types, coercion, defaults, and error shapes.
Centralizing ownership does not require replacing that contract. Retain Zod and
the existing `zod/compile` initialization. Existing Effect schemas remain intact;
this extraction does not introduce dual validators or Zod-to-Effect adapters.

Only unify rules with identical semantics. For example, event source configuration
and skill fields are shared, while API schedule validation additionally requires
weekly/monthly selectors and a real calendar date. Form defaults and API query
coercions remain at their respective boundaries.

Run
`bun run check-types --filter=@notra/schemas --filter=dashboard --filter=api`
from the repository root.
