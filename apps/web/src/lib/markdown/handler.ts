import { createDualmarkRouteHandler } from "@dualmark/nextjs";

import { MARKDOWN_CACHE_CONTROL } from "@/constants/not-found";
import { DYNAMIC_PAGE_CACHE_CONTROL } from "@/constants/proxy";
import {
  buildDualmarkCollections,
  buildDualmarkParameterizedRoutes,
  buildDualmarkStaticPages,
} from "@/utils/markdown-twins";
import {
  MarkdownNotFoundError,
  markdownNotFoundResponse,
} from "@/utils/not-found";
import { SITE_URL } from "@/utils/urls";

const handler = createDualmarkRouteHandler({
  siteUrl: SITE_URL,
  collections: buildDualmarkCollections(),
  staticPages: buildDualmarkStaticPages(),
  parameterizedRoutes: buildDualmarkParameterizedRoutes(),
  headers: {
    cacheControl: MARKDOWN_CACHE_CONTROL,
  },
});

export async function serveMarkdownTwin(request: Request, path: string[]) {
  let response: Response;

  try {
    response = await handler.GET(request, {
      params: Promise.resolve({ path }),
    });
  } catch (error) {
    if (error instanceof MarkdownNotFoundError) {
      return markdownNotFoundResponse();
    }
    throw error;
  }

  if (response.status === 404) {
    return markdownNotFoundResponse();
  }

  if (path[0] === "integrations" && path[1] !== "slack") {
    response.headers.set("Cache-Control", DYNAMIC_PAGE_CACHE_CONTROL);
  }

  return response;
}
