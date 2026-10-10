export interface ResolvedAuthor {
  id: string | null;
  name: string;
  title?: string;
  bio?: string;
  avatar?: string;
  href?: string;
  links: string[];
  url?: string;
}

export interface AuthorAvatarProps {
  author: ResolvedAuthor;
  size?: number;
  class?: string;
  loading?: "eager" | "lazy";
}

export interface AuthorListProps {
  authors: ResolvedAuthor[];
}

export interface AuthorPageProps {
  author: ResolvedAuthor;
}
