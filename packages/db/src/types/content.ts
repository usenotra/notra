import type {
  BLOG_POST_SUBTYPES,
  CONTENT_PUBLICATION_STATUSES,
  POST_VISIBILITIES,
} from "../constants/content";

export type BlogPostSubtype = (typeof BLOG_POST_SUBTYPES)[number];

export type ContentPublicationStatus =
  (typeof CONTENT_PUBLICATION_STATUSES)[number];

export type PostVisibility = (typeof POST_VISIBILITIES)[number];
