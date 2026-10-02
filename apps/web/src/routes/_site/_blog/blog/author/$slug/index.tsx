import { HugeiconsIcon } from "@hugeicons/react";
import { buttonVariants } from "@notra/ui/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { ViewTransition } from "react";

import { BlogAuthorAvatar } from "@/components/blog-author-avatar";
import { BlogPostCard } from "@/components/blog-post-card";
import { getBlogAuthorPage } from "@/lib/blog/functions";
import { resolveSocialLink } from "@/utils/author-socials";
import {
  blogAuthorAvatarTransitionName,
  blogAuthorNameTransitionName,
} from "@/utils/blog-view-transitions";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { TWITTER_HANDLE, pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const Route = createFileRoute("/_site/_blog/blog/author/$slug/")({
  loader: ({ params }) => getBlogAuthorPage({ data: { slug: params.slug } }),
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=3000, stale-while-revalidate=86400",
  }),
  head: ({ loaderData, params }) => {
    const author = loaderData?.author;
    if (!author) {
      return buildHead({});
    }

    const url = `${SITE_URL}/blog/author/${params.slug}`;
    const description = author.bio ?? `Articles written by ${author.name}.`;
    const socialTitle = author.role
      ? `${author.name} - ${author.role}`
      : author.name;

    return buildHead({
      title: { absolute: socialTitle },
      description,
      alternates: pageAlternates(url),
      openGraph: {
        title: socialTitle,
        description,
        url,
        type: "profile",
        siteName: "Notra",
        images: [
          {
            url: `${url}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: "Notra blog author",
            type: "image/png",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: socialTitle,
        description,
        site: TWITTER_HANDLE,
        creator: TWITTER_HANDLE,
      },
    });
  },
  component: BlogAuthorPage,
});

function BlogAuthorPage() {
  const { slug } = Route.useParams();
  const { author, postCount, cardItems } = Route.useLoaderData();

  const socials = author.socials
    .map(resolveSocialLink)
    .filter((social) => social !== null);
  const postLabel = postCount === 1 ? "post" : "posts";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: author.name, url: `${SITE_URL}/blog/author/${slug}` },
  ]);

  return (
    <div className="mx-auto w-full max-w-220 px-4 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pt-32 lg:px-0">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload is server-built and script-close-escaped
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
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
          {postCount} {postLabel}
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
