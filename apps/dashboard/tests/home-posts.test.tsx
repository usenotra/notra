import { beforeEach, describe, expect, mock, test } from "bun:test";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

const activeProject = mock(() => ({
  projectId: "project-1",
  isResolved: true,
}));

mock.module("@/lib/hooks/use-active-project", () => ({
  useActiveProject: activeProject,
}));
mock.module("@/lib/orpc/query", () => ({
  dashboardOrpc: {
    content: {
      home: {
        get: {
          queryOptions: ({ input }: { input: unknown }) => ({
            queryKey: ["content", "home", input],
            queryFn: async () => ({ posts: [] }),
          }),
        },
      },
      list: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ["content", "list", input],
          queryFn: async () => ({ posts: [] }),
        }),
      },
      recents: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ["content", "recents", input],
          queryFn: async () => ({ posts: [] }),
        }),
      },
    },
  },
}));

const { useDashboardHomeContent, usePosts, useRecentPosts } =
  await import("../src/lib/hooks/use-posts");
let organizationId = "org-1";

function TodayPostsProbe() {
  useDashboardHomeContent(organizationId);
  return null;
}

function ContentListProbe() {
  usePosts(organizationId, 2);
  return null;
}

function RecentsProbe() {
  useRecentPosts(organizationId);
  return null;
}

beforeEach(() => {
  organizationId = "org-1";
  activeProject.mockReturnValue({ projectId: "project-1", isResolved: true });
});

describe("dashboard home post query", () => {
  test("requests the project-scoped dashboard home payload", () => {
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <TodayPostsProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "content",
      "home",
      {
        organizationId: "org-1",
        projectId: "project-1",
      },
    ]);
  });

  test("keeps content-list pagination at twelve posts", () => {
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ContentListProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "content",
      "list",
      {
        organizationId: "org-1",
        projectId: "project-1",
        page: 2,
        pageSize: 12,
      },
    ]);
  });

  test("requests three project-scoped recents without list pagination", () => {
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <RecentsProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "content",
      "recents",
      {
        organizationId: "org-1",
        projectId: "project-1",
        limit: 3,
      },
    ]);
  });

  test("waits for the active project before requesting recents", () => {
    activeProject.mockReturnValue({
      projectId: "project-1",
      isResolved: false,
    });
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <RecentsProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.options).toMatchObject({
      enabled: false,
    });
  });

  test("waits for the active project before requesting today's posts", () => {
    activeProject.mockReturnValue({
      projectId: "project-1",
      isResolved: false,
    });
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <TodayPostsProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.options).toMatchObject({
      enabled: false,
    });
  });

  test("does not request today's posts without an organization", () => {
    organizationId = "";
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <TodayPostsProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.options).toMatchObject({
      enabled: false,
    });
  });
});
