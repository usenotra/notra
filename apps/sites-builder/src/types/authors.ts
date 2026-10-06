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
