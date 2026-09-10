import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { BLOG_AUTHORS } from "../src/constants/blog-authors";
import { generateImagePlaceholder } from "../src/utils/image-placeholder";

const sources = [
  ...new Set(BLOG_AUTHORS.flatMap(({ image }) => (image ? [image] : []))),
];
const entries = await Promise.all(
  sources.map(async (src) => [
    src,
    await generateImagePlaceholder(
      fileURLToPath(new URL(`../public${src}`, import.meta.url))
    ),
  ])
);

// Commit the generated data so type checks and editors work before the first build.
await writeFile(
  new URL("../src/constants/blog-image-placeholders.json", import.meta.url),
  `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`
);
