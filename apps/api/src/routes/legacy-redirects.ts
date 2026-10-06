import { OpenAPIHono } from "@hono/zod-openapi";

import type { ApiEnv } from "../types/env";
import { getOrganizationId } from "../utils/auth";
import {
  ORGANIZATION_POST_PATH_REGEX,
  ORGANIZATION_POSTS_PATH_REGEX,
} from "../utils/regex";

export const legacyRedirectRoutes = new OpenAPIHono<ApiEnv>();

legacyRedirectRoutes.get("/:organizationId/posts", async (c) => {
  const log = c.get("log");

  log.set({ legacyRedirect: true });
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_POSTS_PATH_REGEX,
    "/posts"
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});

legacyRedirectRoutes.get("/:organizationId/posts/:postId", async (c) => {
  const log = c.get("log");

  log.set({ legacyRedirect: true });
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  const postId = c.req.param("postId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_POST_PATH_REGEX,
    `/posts/${postId}`
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});

legacyRedirectRoutes.patch("/:organizationId/posts/:postId", async (c) => {
  const log = c.get("log");

  log.set({ legacyRedirect: true });
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  const postId = c.req.param("postId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_POST_PATH_REGEX,
    `/posts/${postId}`
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});
