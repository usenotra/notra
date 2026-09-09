import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import type { BlogEntryPageProps } from "~types/blog";

import { blog } from "@/../.source/server";
import { BlogArticle } from "@/components/blog-article";
import { BlogCopyArticle } from "@/components/blog-copy-article";
import { getBlogMDXComponents } from "@/components/blog-mdx-components";
import { BlogPostPagination } from "@/components/blog-post-pagination";
import { BlogPostSidebar } from "@/components/blog-post-sidebar";
import {
  formatBlogDate,
  getNotraBlogPostBySlug,
  getNotraBlogPostPagination,
  listNotraBlogPosts,
} from "@/utils/blog";
import {
  buildBlogArticleJsonLd,
  buildBlogFaqJsonLd,
} from "@/utils/blog-jsonld";
import { blogPostTitleTransitionName } from "@/utils/blog-view-transitions";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { DEFAULT_SOCIAL_IMAGE, TWITTER_HANDLE } from "@/utils/metadata";
import { getReadingTimeMinutes } from "@/utils/reading-time";
import { SITE_URL } from "@/utils/urls";

export const revalidate = 3000;

export async function generateStaticParams() {
  const posts = await listNotraBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogEntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNotraBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  const url = `${SITE_URL}/blog/${slug}`;

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
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
    },
  };
}

export default async function BlogEntryPage({ params }: BlogEntryPageProps) {
  const { slug } = await params;
  const post = await getNotraBlogPostBySlug(slug);

  const entry = blog.find((item) => item.info.path === `${slug}.mdx`);
  if (!(post && entry)) {
    notFound();
  }
  const MDX = entry.body;

  const url = `${SITE_URL}/blog/${slug}`;
  const markdownUrl = `${SITE_URL}/blog/${slug}.md`;
  const imageUrl = `${SITE_URL}${DEFAULT_SOCIAL_IMAGE.url}`;
  const toc = entry.toc;
  const readingMinutes = getReadingTimeMinutes(post.markdown);
  const { previous, next } = await getNotraBlogPostPagination(slug);
  const articleJsonLd = buildBlogArticleJsonLd({ post, url, imageUrl });
  const faqJsonLd = buildBlogFaqJsonLd(post);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: post.title, url },
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-stretch px-4 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pt-32">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload is server-built and script-close-escaped
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload is server-built and script-close-escaped
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      {faqJsonLd ? (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload is server-built and script-close-escaped
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
          type="application/ld+json"
        />
      ) : null}

      <article className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-x-16 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24 [&_h4]:scroll-mt-24">
        <header className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-1 lg:row-start-1">
          <ViewTransition name="blog-back-button">
            <Link
              className="group mb-6 inline-flex items-center gap-2 font-mono text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
              href="/blog"
            >
              <HugeiconsIcon
                className="size-4 transition-transform group-hover:-translate-x-0.5"
                icon={ArrowLeft02Icon}
                strokeWidth={2}
              />
              Back to blog
            </Link>
          </ViewTransition>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm text-neutral-700 dark:text-neutral-200">
            <time dateTime={post.createdAt}>
              Published {formatBlogDate(post.createdAt)}
            </time>
            <span className="whitespace-nowrap">
              · {readingMinutes} min read
            </span>
          </div>

          <ViewTransition name={blogPostTitleTransitionName(slug)}>
            <h1 className="font-display mt-6 max-w-3xl text-4xl leading-[1.05] font-medium tracking-[-0.02em] text-balance text-[#1E1E1E] sm:text-5xl dark:text-white">
              {post.title}
            </h1>
          </ViewTransition>
        </header>

        <BlogPostSidebar authors={post.authors} toc={toc} />

        <div className="col-start-2 row-start-2 self-start justify-self-end lg:col-start-1">
          <BlogCopyArticle
            markdown={post.markdown}
            markdownUrl={markdownUrl}
            title={post.title}
          />
        </div>

        <div className="border-border col-span-2 min-w-0 border-t pt-6 lg:col-span-1 lg:col-start-1 lg:row-start-3">
          <BlogArticle>
            <MDX components={getBlogMDXComponents()} />
          </BlogArticle>

          <BlogPostPagination next={next} previous={previous} />
        </div>
      </article>
    </div>
  );
}
