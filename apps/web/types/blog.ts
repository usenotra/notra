import type { IconSvgElement } from "@hugeicons/react";
import type { TOCItemType } from "fumadocs-core/toc";
import type { ReactNode } from "react";

export interface BlogAuthorAvatarProps {
  image: string | null;
  name: string;
  size?: number;
}

export interface NotraAuthorSocial {
  url: string;
  platform: string;
}

export interface NotraBlogAuthor {
  id: string;
  name: string;
  image: string | null;
  slug: string;
  bio: string | null;
  role: string | null;
  socials: NotraAuthorSocial[];
}

export interface NotraAuthor extends NotraBlogAuthor {
  postCount: number;
}

export interface BlogAuthorPageProps {
  params: Promise<{ slug: string }>;
}

export interface BlogCopyArticleProps {
  markdown: string;
  markdownUrl: string;
  title: string;
}

export interface BlogCopyArticleItemProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface NotraBlogPost {
  id: string;
  title: string;
  content: string;
  markdown: string;
  recommendations: string | null;
  contentType: string;
  sourceMetadata: null;
  status: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
  excerpt: string;
  authors: NotraBlogAuthor[];
}

interface BlogPageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description: ReactNode;
}

interface BlogTimelineItem {
  id: string;
  title: string;
  description: string;
  href: string;
  date: string;
}

export interface BlogCardAuthor {
  name: string;
  image: string | null;
  slug: string;
  href: string;
}

export interface BlogPaginationLink {
  slug: string;
  href: string;
  title: string;
  author: BlogCardAuthor | null;
}

export interface BlogPostPaginationProps {
  previous: BlogPaginationLink | null;
  next: BlogPaginationLink | null;
}

export interface BlogPaginationCardProps {
  link: BlogPaginationLink;
  direction: "previous" | "next";
  align: "left" | "right";
}

export interface BlogCardItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  href: string;
  date: string;
  author: BlogCardAuthor | null;
}

export interface BlogPostCardProps {
  item: BlogCardItem;
}

interface BlogTimelineProps {
  items: BlogTimelineItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}

interface BlogHtmlArticleProps {
  html: string;
}

export interface BlogEntryPageProps {
  params: Promise<{ slug: string }>;
}

export interface BlogFaqEntry {
  question: string;
  answer: string;
}

export interface BlogJsonLdInput {
  post: NotraBlogPost;
  url: string;
  imageUrl: string;
}

export interface BlogArticleProps {
  children: ReactNode;
}

export interface BlogPostAuthorCardProps {
  authors: NotraBlogAuthor[];
}

export interface BlogPostTocProps {
  toc: TOCItemType[];
}

export interface TocPosition {
  id: string;
  depth: number;
  top: number;
  height: number;
}

export interface BlogPostSidebarProps {
  authors: NotraBlogAuthor[];
  toc: TOCItemType[];
}

export interface ResolvedSocialLink {
  label: string;
  displayUrl: string;
  url: string;
  icon: IconSvgElement;
}
