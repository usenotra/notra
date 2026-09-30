import {
  createDualmarkRouteHandler,
  type DualmarkRouteHandler,
} from "@dualmark/nextjs";

import { MARKDOWN_CACHE_CONTROL } from "@/constants/not-found";
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

export const runtime = "nodejs";
export const revalidate = 300;
export const generateStaticParams = handler.generateStaticParams;

export const GET: DualmarkRouteHandler["GET"] = async (request, context) => {
  let response: Response;

  try {
    response = await handler.GET(request, context);
  } catch (error) {
    if (error instanceof MarkdownNotFoundError) {
      return markdownNotFoundResponse();
    }
    throw error;
  }

  if (response.status === 404) {
    return markdownNotFoundResponse();
  }

  return response;
};
