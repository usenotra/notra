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
      list: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ["content", "list", input],
          queryFn: async () => ({ posts: [] }),
        }),
      },
    },
  },
}));

const { usePosts, useTodayPosts } = await import("../src/lib/hooks/use-posts");
let organizationId = "org-1";

function TodayPostsProbe() {
  useTodayPosts(organizationId);
  return null;
}

function ContentListProbe() {
  usePosts(organizationId, 2);
  return null;
}

beforeEach(() => {
  organizationId = "org-1";
  activeProject.mockReturnValue({ projectId: "project-1", isResolved: true });
});

describe("dashboard home post query", () => {
  test("requests only three scoped posts for today's preview", () => {
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <TodayPostsProbe />
      </QueryClientProvider>
    );

    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "content",
      "list",
      {
        organizationId: "org-1",
        projectId: "project-1",
        page: 1,
        pageSize: 3,
        date: "today",
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
