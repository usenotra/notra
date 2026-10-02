import type {
  Head,
  HeadLink,
  HeadMeta,
  Metadata,
  MetadataImage,
  MetadataTitle,
} from "@/types/metadata";

import { ROOT_METADATA, TITLE_TEMPLATE } from "./metadata";
import { SITE_URL } from "./urls";

function absoluteUrl(url: string) {
  return new URL(url, SITE_URL).toString();
}

function resolveTitle(title: MetadataTitle | undefined) {
  if (title === undefined) {
    return;
  }
  if (typeof title === "string") {
    return TITLE_TEMPLATE.replace("%s", title);
  }
  if ("absolute" in title) {
    return title.absolute;
  }
  return title.default;
}

function toImage(image: string | MetadataImage): MetadataImage {
  return typeof image === "string" ? { url: image } : image;
}

function pushMeta(
  meta: HeadMeta[],
  key: "name" | "property",
  id: string,
  content: string | number | undefined
) {
  if (content === undefined) {
    return;
  }
  meta.push({ [key]: id, content: String(content) });
}

export function buildHead(page: Metadata = {}): Head {
  const metadata: Metadata = { ...ROOT_METADATA, ...page };
  const meta: HeadMeta[] = [];
  const links: HeadLink[] = [];

  const title =
    page.title === undefined
      ? resolveTitle({ absolute: String(ROOT_METADATA.title) })
      : resolveTitle(page.title);
  if (title) {
    meta.push({ title });
  }

  pushMeta(meta, "name", "description", metadata.description);
  pushMeta(meta, "name", "keywords", metadata.keywords?.join(","));
  pushMeta(meta, "name", "creator", metadata.creator);
  pushMeta(meta, "name", "category", metadata.category);

  if (metadata.robots) {
    const { index = true, follow = true } = metadata.robots;
    pushMeta(
      meta,
      "name",
      "robots",
      `${index ? "index" : "noindex"}, ${follow ? "follow" : "nofollow"}`
    );
  }

  if (metadata.alternates?.canonical) {
    links.push({
      rel: "canonical",
      href: absoluteUrl(metadata.alternates.canonical),
    });
  }
  for (const [type, href] of Object.entries(metadata.alternates?.types ?? {})) {
    links.push({ rel: "alternate", type, href: absoluteUrl(href) });
  }

  for (const [name, content] of Object.entries(metadata.other ?? {})) {
    pushMeta(meta, "name", name, content);
  }

  const { openGraph } = metadata;
  if (openGraph) {
    pushMeta(meta, "property", "og:title", openGraph.title);
    pushMeta(meta, "property", "og:description", openGraph.description);
    pushMeta(
      meta,
      "property",
      "og:url",
      openGraph.url ? absoluteUrl(openGraph.url) : undefined
    );
    pushMeta(meta, "property", "og:site_name", openGraph.siteName);
    pushMeta(meta, "property", "og:locale", openGraph.locale);
    const image = openGraph.images?.[0];
    if (image) {
      const { url, width, height, alt, type } = toImage(image);
      pushMeta(meta, "property", "og:image", absoluteUrl(url));
      pushMeta(meta, "property", "og:image:width", width);
      pushMeta(meta, "property", "og:image:height", height);
      pushMeta(meta, "property", "og:image:alt", alt);
      pushMeta(meta, "property", "og:image:type", type);
    }
    pushMeta(meta, "property", "og:type", openGraph.type);
    pushMeta(
      meta,
      "property",
      "article:published_time",
      openGraph.publishedTime
    );
    pushMeta(meta, "property", "article:modified_time", openGraph.modifiedTime);
    const author = openGraph.authors?.[0];
    pushMeta(meta, "property", "article:author", author);
  }

  const { twitter } = metadata;
  if (twitter) {
    pushMeta(meta, "name", "twitter:card", twitter.card);
    pushMeta(meta, "name", "twitter:site", twitter.site);
    pushMeta(meta, "name", "twitter:creator", twitter.creator);
    pushMeta(meta, "name", "twitter:title", twitter.title);
    pushMeta(meta, "name", "twitter:description", twitter.description);
    const image = twitter.images?.[0];
    if (image) {
      const { url, alt } = toImage(image);
      pushMeta(meta, "name", "twitter:image", absoluteUrl(url));
      pushMeta(meta, "name", "twitter:image:alt", alt);
    }
  }

  for (const icon of metadata.icons?.icon ?? []) {
    links.push({
      rel: "icon",
      href: icon.url,
      sizes: icon.sizes,
      type: icon.type,
    });
  }
  for (const icon of metadata.icons?.apple ?? []) {
    links.push({
      rel: "apple-touch-icon",
      href: icon.url,
      sizes: icon.sizes,
      type: icon.type,
    });
  }

  return { meta, links };
}
