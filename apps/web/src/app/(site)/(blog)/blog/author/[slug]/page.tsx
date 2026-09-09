import { HugeiconsIcon } from "@hugeicons/react";
import { buttonVariants } from "@notra/ui/components/ui/button";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import type { BlogAuthorPageProps } from "~types/blog";

import { BlogAuthorAvatar } from "@/components/blog-author-avatar";
import { BlogPostCard } from "@/components/blog-post-card";
import { resolveSocialLink } from "@/utils/author-socials";
import {
  filterPostsByAuthorSlug,
  getNotraAuthorBySlug,
  listNotraAuthors,
} from "@/utils/authors";
import { buildBlogCardItems, listNotraBlogPosts } from "@/utils/blog";
import {
  blogAuthorAvatarTransitionName,
  blogAuthorNameTransitionName,
} from "@/utils/blog-view-transitions";
import { TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const revalidate = 3000;

export async function generateStaticParams() {
  const authors = await listNotraAuthors();
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({
  params,
}: BlogAuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getNotraAuthorBySlug(slug);

  if (!author) {
    return {};
  }

  const url = `${SITE_URL}/blog/author/${slug}`;
  const description = author.bio ?? `Articles written by ${author.name}.`;
  const socialTitle = author.role
    ? `${author.name} - ${author.role}`
    : author.name;

  return {
    title: { absolute: socialTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      type: "profile",
      siteName: "Notra",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
    },
  };
}

export default async function BlogAuthorPage({ params }: BlogAuthorPageProps) {
  const { slug } = await params;
  const author = await getNotraAuthorBySlug(slug);

  if (!author) {
    notFound();
  }

  const posts = await listNotraBlogPosts();
  const authorPosts = filterPostsByAuthorSlug(posts, slug);
  const cardItems = buildBlogCardItems(authorPosts);
  const socials = author.socials
    .map(resolveSocialLink)
    .filter((social) => social !== null);
  const postLabel = authorPosts.length === 1 ? "post" : "posts";

  return (
    <div className="mx-auto w-full max-w-220 px-4 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pt-32 lg:px-0">
      <div className="flex flex-col items-start gap-5">
        <ViewTransition name={blogAuthorAvatarTransitionName(author.slug)}>
          <BlogAuthorAvatar image={author.image} name={author.name} size={80} />
        </ViewTransition>

        <div className="flex flex-col gap-1">
          <ViewTransition name={blogAuthorNameTransitionName(author.slug)}>
            <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
              {author.name}
            </h1>
          </ViewTransition>
          {author.role ? (
            <p className="text-foreground/50 font-mono text-sm">
              {author.role}
            </p>
          ) : null}
        </div>

        {socials.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {socials.map((social) => (
              <li key={social.url}>
                <a
                  aria-label={social.displayUrl}
                  className={buttonVariants({
                    size: "icon",
                    variant: "outline",
                  })}
                  href={social.url}
                  rel="noopener"
                  target="_blank"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={social.icon}
                    strokeWidth={2}
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-border mt-14 border-t pt-8">
        <h2 className="text-foreground/40 font-mono text-sm">
          {authorPosts.length} {postLabel}
        </h2>

        {cardItems.length > 0 ? (
          <ul className="mt-6 grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
            {cardItems.map((item) => (
              <li className="h-full" key={item.id}>
                <BlogPostCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-4 font-sans text-sm leading-6">
            No posts published yet.
          </p>
        )}
      </div>
    </div>
  );
}
