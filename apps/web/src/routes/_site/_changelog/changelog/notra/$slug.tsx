import { createFileRoute, Link } from "@tanstack/react-router";
import type { NotraChangelogEntryData } from "~types/changelog";

import browserCollections from "@/../.source/browser";
import { BlogArticle } from "@/components/blog-article";
import { getBlogMDXComponents } from "@/components/blog-mdx-components";
import { NotraMark } from "@/components/notra-mark";
import { getNotraChangelogEntry } from "@/lib/changelog/functions";
import { formatChangelogDate } from "@/utils/format-date";
import { buildHead } from "@/utils/head";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const notraChangelogContent =
  browserCollections.notraChangelog.createClientLoader({
    component: ({ default: MDX }, { post }: NotraChangelogEntryData) => {
      const url = `${SITE_URL}/changelog/notra/${post.slug}`;
      const articleJsonLd = buildArticleJsonLd({
        url,
        title: post.title,
        description: post.excerpt,
        imageUrl: `${SITE_URL}${DEFAULT_SOCIAL_IMAGE.url}`,
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
      });
      const breadcrumbJsonLd = buildBreadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: "Changelog", url: `${SITE_URL}/changelog` },
        { name: "Notra", url: `${SITE_URL}/changelog/notra` },
        { name: post.title, url },
      ]);

      return (
        <div className="mx-auto w-full max-w-190 px-4 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pt-32 lg:px-0">
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
            type="application/ld+json"
          />
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(breadcrumbJsonLd),
            }}
            type="application/ld+json"
          />
          <Link
            className="text-foreground/50 hover:text-foreground mb-6 inline-flex items-center gap-1 font-sans text-sm transition-colors"
            to="/changelog/notra"
          >
            &larr; All updates
          </Link>

          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[#1E1E1E] sm:text-4xl dark:text-white">
            {post.title}
          </h1>
          <time className="text-foreground/40 mt-2 block font-sans text-sm">
            {formatChangelogDate(post.createdAt)}
          </time>

          <div className="mt-4 flex items-center gap-1.5">
            <span className="text-primary">
              <NotraMark className="size-3.5 shrink-0" />
            </span>
            <p className="text-muted-foreground font-sans text-xs">
              Published by the Notra team.
            </p>
          </div>

          <BlogArticle>
            <MDX components={getBlogMDXComponents()} />
          </BlogArticle>
        </div>
      );
    },
  });

export const Route = createFileRoute("/_site/_changelog/changelog/notra/$slug")(
  {
    loader: async ({ params }) => {
      const data = await getNotraChangelogEntry({
        data: { slug: params.slug },
      });
      await notraChangelogContent.preload(data.path);
      return data;
    },
    head: ({ loaderData, params }) => {
      const post = loaderData?.post;
      if (!post) {
        return {};
      }
      const url = `${SITE_URL}/changelog/notra/${params.slug}`;
      return buildHead({
        title: { absolute: post.title },
        description: post.excerpt,
        alternates: pageAlternates(url),
        openGraph: {
          title: post.title,
          description: post.excerpt,
          url,
          type: "article",
          publishedTime: post.createdAt,
          modifiedTime: post.updatedAt,
          siteName: "Notra",
          images: [DEFAULT_SOCIAL_IMAGE],
        },
        twitter: {
          card: "summary_large_image",
          title: post.title,
          description: post.excerpt,
          images: [DEFAULT_SOCIAL_IMAGE.url],
          site: TWITTER_HANDLE,
          creator: TWITTER_HANDLE,
        },
      });
    },
    component: ChangelogEntryPage,
  }
);

function ChangelogEntryPage() {
  const data = Route.useLoaderData();
  return notraChangelogContent.useContent(data.path, data);
}
