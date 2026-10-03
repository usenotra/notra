import type { BlogAuthorMarkdownPage } from "@/types/blog-author";
import { getAuthorHref } from "@/utils/author-href";
import { resolveSocialLink } from "@/utils/author-socials";
import {
  filterPostsByAuthorSlug,
  getNotraAuthorBySlug,
  listNotraAuthors,
} from "@/utils/authors";
import { listNotraBlogPosts } from "@/utils/blog";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

function getAuthorTitle(name: string, role: string | null) {
  return role ? `${name} - ${role}` : name;
}

function getAuthorDescription(name: string, bio: string | null) {
  return bio ?? `Articles written by ${name}.`;
}

export async function listBlogAuthorMarkdownPages(): Promise<
  BlogAuthorMarkdownPage[]
> {
  const authors = await listNotraAuthors();
  return authors.map((author) => ({
    slug: author.slug,
    title: getAuthorTitle(author.name, author.role),
    description: getAuthorDescription(author.name, author.bio),
  }));
}

export async function buildBlogAuthorMarkdown(
  slug: string
): Promise<string | null> {
  const author = await getNotraAuthorBySlug(slug);

  if (!author) {
    return null;
  }

  const posts = filterPostsByAuthorSlug(await listNotraBlogPosts(), slug);
  const socials = author.socials
    .map(resolveSocialLink)
    .filter((social) => social !== null)
    .map((social) => `- [${social.label}](${social.url})`);
  const postLabel = posts.length === 1 ? "post" : "posts";
  const postList = posts.map(
    (post) =>
      `- [${post.title}](${SITE_URL}/blog/${post.slug}.md) (${post.createdAt})${post.excerpt ? `: ${post.excerpt}` : ""}`
  );

  return [
    `# ${author.name}`,
    "",
    ...(author.role ? [author.role, ""] : []),
    getAuthorDescription(author.name, author.bio),
    "",
    `Profile: ${SITE_URL}${getAuthorHref(author.slug)}`,
    "",
    ...(socials.length > 0 ? [markdownSection("Links", socials)] : []),
    markdownSection(`${posts.length} ${postLabel}`, [
      ...(postList.length > 0 ? postList : ["No posts published yet."]),
    ]),
    markdownSection("Related", [`- [Notra Blog](${SITE_URL}/blog.md)`]),
  ].join("\n");
}
