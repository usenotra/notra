import Link from "next/link";
import { ViewTransition } from "react";
import type { BlogPostCardProps } from "~types/blog";

import { BlogAuthorAvatar } from "@/components/blog-author-avatar";
import { DeferredDithering } from "@/components/deferred-dithering";
import { BLOG_CARD_DITHER_MAX_PIXELS } from "@/constants/dithering";
import { formatBlogDate } from "@/utils/blog";
import { getBlogCardDither } from "@/utils/blog-card-dither";
import { blogPostTitleTransitionName } from "@/utils/blog-view-transitions";

export function BlogPostCard({ item }: BlogPostCardProps) {
  return (
    <article className="group hover:border-primary/40 dark:hover:border-primary/40 relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-[#1E1E1E1A] bg-[#C8B2EE26] p-6 transition-colors hover:bg-[#C8B2EE40] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
      <DeferredDithering
        {...getBlogCardDither(item.slug)}
        className="pointer-events-none absolute inset-x-0 -bottom-8 -z-10 h-48 w-full mask-[linear-gradient(to_bottom,transparent_0%,black_100%)]"
        colorBack="#00000000"
        colorFront="#9B7ACC33"
        fit="cover"
        maxPixelCount={BLOG_CARD_DITHER_MAX_PIXELS}
        shape="wave"
        size={3}
        type="4x4"
        unmountOffscreen
      />
      <div className="flex flex-col gap-3">
        <ViewTransition name={blogPostTitleTransitionName(item.slug)}>
          <h2 className="font-display group-hover:text-primary text-xl font-medium tracking-[-0.015em] text-[#1E1E1E] transition-colors sm:text-2xl dark:text-white">
            <Link
              href={item.href}
              className="focus-visible:after:outline-primary after:absolute after:inset-0 after:z-10 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2"
            >
              {item.title}
            </Link>
          </h2>
        </ViewTransition>
        <p className="line-clamp-3 font-sans text-base leading-7 text-[#1E1E1E99] dark:text-white/60">
          {item.description}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-3 pt-6 font-sans text-sm text-[#1E1E1E99] dark:text-white/60">
        {item.author ? (
          <Link
            href={item.author.href}
            className="hover:text-foreground focus-visible:outline-primary relative z-20 flex items-center gap-2 rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BlogAuthorAvatar
              image={item.author.image}
              name={item.author.name}
              size={24}
            />
            <span>{item.author.name}</span>
          </Link>
        ) : null}
        {item.author ? <span aria-hidden="true">·</span> : null}
        <time>{formatBlogDate(item.date)}</time>
      </div>
    </article>
  );
}
