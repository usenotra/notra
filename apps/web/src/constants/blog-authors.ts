import type { NotraBlogAuthor } from "~types/blog";

export const BLOG_AUTHORS: NotraBlogAuthor[] = [
  {
    id: "dominik",
    name: "Dominik Koch",
    image: "/blog/authors/dominik.png",
    slug: "dominik",
    bio: null,
    role: "Founder",
    socials: [
      {
        url: "https://x.com/dominikkoch",
        platform: "x",
      },
      {
        url: "https://dominikkoch.dev/",
        platform: "website",
      },
    ],
  },
  {
    id: "josh",
    name: "Josh",
    image: "/blog/authors/josh.webp",
    slug: "josh",
    bio: "Guest author and developer relations at Upstash.",
    role: "Head of Propaganda @ Upstash",
    socials: [
      {
        url: "https://x.com/joshtriedcoding",
        platform: "x",
      },
      {
        url: "https://www.youtube.com/@joshtriedcoding",
        platform: "youtube",
      },
    ],
  },
  {
    id: "jan",
    name: "Jan Burzinski",
    image: "/blog/authors/jan.webp",
    slug: "jan",
    bio: null,
    role: "Founding Intern",
    socials: [
      {
        url: "https://x.com/miaugladiator1",
        platform: "x",
      },
      {
        url: "https://www.janburzinski.de/",
        platform: "website",
      },
    ],
  },
  {
    id: "notra",
    name: "Notra Team",
    image: "/blog/authors/notra.png",
    slug: "notra",
    bio: null,
    role: null,
    socials: [],
  },
];
