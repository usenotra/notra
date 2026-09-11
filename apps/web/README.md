This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Shared UI styles

`bun run dev` generates `src/styles/ui-sources.css` from the
marketing app's shared UI imports, including transitive imports and lazy-loaded
components. This keeps dashboard-only utilities out of the marketing stylesheet.
After adding a shared UI import while the dev server is running, run
`bun run styles:generate` (or restart the dev server). Commit the generated CSS
with the import change. `bun run styles:check` verifies that the source list is
current. `bun run build` runs this check before Next.js and fails if the committed
source list is stale, rather than silently regenerating it.

## Blog and product changelog

Published content lives in `src/content/blog/*.mdx` and
`src/content/notra-changelog/*.mdx`. Each filename is its public URL slug.
Add a post with this frontmatter, followed by its Markdown/MDX body:

```yaml
---
title: "Post title"
description: "Summary used on cards and in search metadata."
date: "2026-06-03T00:00:00.000Z"
updatedAt: "2026-06-03T00:00:00.000Z"
author: "dominik"
---
```

Author profiles and social links are in `src/constants/blog-authors.ts`.
Store article images and author avatars in `public/blog/` and reference them
with `/blog/...` paths. Dates and author slugs are validated during the build.
Only add files here when they are ready to publish: every entry is published
on deployment. Posts are ordered by publication date, newest first.

Fumadocs compiles the MDX at build time, with Shiki syntax highlighting in
GitHub light/dark themes and copy buttons for fenced code blocks. Keep the
explicit `[#heading-id]` annotations on migrated headings to preserve links. The same content supplies the blog,
author pages, product changelog, RSS, sitemap, and `.md` endpoints. Changes
ship with the web app; there are no content API keys or publishing webhooks.

Run `bun run build --filter=web` from the repository root to validate all
content and generate the site.
