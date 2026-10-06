# Notra Documentation

Documentation for Notra and its API!


## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint):

```bash
npm i -g mint
```

Start the development server:

```bash
mint dev
```

Alternatively, if you do not want to install the CLI globally, you can run a one-time script:

```bash
npx mint dev
```

## OpenAPI auto-generated API pages

`docs.json` is configured to auto-populate API pages from
`https://api.usenotra.com/openapi.json`.

Validate the live OpenAPI spec before pushing docs changes:

```bash
bun run openapi:check
```

## Design-system buttons

`buttons.css` adapts the primary and outline styles from `packages/ui/src/components/ui/button.tsx`.
The navbar Dashboard link uses the same primary style. Mintlify loads this CSS
automatically. Keep these styles in sync when the design-system buttons change; Mintlify
cannot import their Base UI and other npm dependencies directly.

For buttons in page content, import the snippet in the parent MDX page:

```mdx
import { DocsButton } from "/snippets/button.jsx"

<DocsButton href="https://app.usenotra.com">Open dashboard</DocsButton>
<DocsButton href="/quickstart" variant="outline">Get started</DocsButton>
```

Use `href` for navigation. Without `href`, the component renders a native button
and accepts button props such as `onClick` and `disabled`.

---

Built with ❤️ using [Mintlify](https://mintlify.com)
