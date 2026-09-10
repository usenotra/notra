import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChangelogEntryPageProps } from "~types/changelog";

import { notraChangelog } from "@/../.source/server";
import { BlogArticle } from "@/components/blog-article";
import { getBlogMDXComponents } from "@/components/blog-mdx-components";
import { NotraMark } from "@/components/notra-mark";
import {
  formatChangelogDate,
  getNotraChangelogPostBySlug,
} from "@/utils/changelog";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/utils/jsonld";
import { DEFAULT_SOCIAL_IMAGE, TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export function generateStaticParams() {
  return notraChangelog.map((entry) => ({
    slug: entry.info.path.replace(/\.mdx$/, ""),
  }));
}

export async function generateMetadata({
  params,
}: ChangelogEntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNotraChangelogPostBySlug(slug);

  if (!post) {
    return {};
  }

  const url = `${SITE_URL}/changelog/notra/${slug}`;

  return {
    title: { absolute: post.title },
    description: post.excerpt,
    alternates: { canonical: url },
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
  };
}

export default async function ChangelogEntryPage({
  params,
}: ChangelogEntryPageProps) {
  const { slug } = await params;
  const post = await getNotraChangelogPostBySlug(slug);

  const entry = notraChangelog.find((item) => item.info.path === `${slug}.mdx`);
  if (!(post && entry)) {
    notFound();
  }
  const MDX = entry.body;

  const url = `${SITE_URL}/changelog/notra/${slug}`;
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
    <div className="mx-auto w-full max-w-[760px] px-4 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pt-32 lg:px-0">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <Link
        className="text-foreground/50 hover:text-foreground mb-6 inline-flex items-center gap-1 font-sans text-sm transition-colors"
        href="/changelog/notra"
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
}
