import { createFileRoute } from "@tanstack/react-router";

import { listNotraBlogPosts } from "@/utils/blog";
import { buildBlogRssFeed, rssResponse } from "@/utils/rss";

async function GET() {
  const posts = await listNotraBlogPosts();
  const response = rssResponse(buildBlogRssFeed(posts));
  response.headers.set(
    "cache-control",
    "public, max-age=0, s-maxage=3000, stale-while-revalidate=86400"
  );
  return response;
}

export const Route = createFileRoute("/rss.xml")({
  server: { handlers: { GET } },
});
