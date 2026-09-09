import Link from "next/link";
import { ViewTransition } from "react";
import type { BlogPostAuthorCardProps } from "~types/blog";

import { BlogAuthorAvatar } from "@/components/blog-author-avatar";
import { getAuthorHref } from "@/utils/authors";
import {
  blogAuthorAvatarTransitionName,
  blogAuthorNameTransitionName,
} from "@/utils/blog-view-transitions";

export function BlogPostAuthorCard({ authors }: BlogPostAuthorCardProps) {
  if (authors.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-foreground mb-3 font-sans text-sm font-medium">
        Written by
      </p>
      <ul className="flex flex-col gap-3">
        {authors.map((author) => (
          <li key={author.id}>
            <Link
              className="group/author hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-primary -mx-2 -my-2 flex w-fit max-w-full items-center gap-3 rounded-xl p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              href={getAuthorHref(author.slug)}
            >
              <ViewTransition
                name={blogAuthorAvatarTransitionName(author.slug)}
              >
                <BlogAuthorAvatar
                  image={author.image}
                  name={author.name}
                  size={24}
                />
              </ViewTransition>
              <span className="flex flex-col">
                <ViewTransition
                  name={blogAuthorNameTransitionName(author.slug)}
                >
                  <span className="font-sans text-sm leading-tight font-medium text-neutral-700 transition-colors dark:text-neutral-200">
                    {author.name}
                  </span>
                </ViewTransition>
                {author.role ? (
                  <span className="mt-0.5 font-sans text-xs leading-tight text-neutral-500 dark:text-neutral-400">
                    {author.role}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
