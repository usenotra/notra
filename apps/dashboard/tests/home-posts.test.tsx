import { beforeEach, describe, expect, mock, test } from "bun:test";

import {
  QueryClient,
  QueryClientProvider,
  type QueryObserverOptions,
} from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

const activeProject = mock(() => ({
  projectId: "project-1",
  isResolved: true,
}));

mock.module("@/lib/hooks/use-active-project", () => ({
  useActiveProject: activeProject,
}));
mock.module("next/navigation", () => ({
  usePathname: () => "/fixture/content",
  useRouter: () => ({ push: mock() }),
}));
mock.module("@/lib/orpc/query", () => ({
  dashboardOrpc: {
    content: {
      activeGenerations: {
        list: {
          queryOptions: (options: object) => ({
            ...options,
            queryKey: ["active-generations"],
            queryFn: async () => ({ generations: [], results: [] }),
          }),
        },
        clearCompleted: {
          mutationOptions: () => ({ mutationFn: async () => undefined }),
        },
      },
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
const { useActiveGenerations } =
  await import("../src/lib/hooks/use-active-generations");
let organizationId = "org-1";

function ActiveGenerationsProbe() {
  useActiveGenerations(organizationId);
  return null;
}

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
  test("keeps discovering external generations while idle and polls faster while active", () => {
    const client = new QueryClient();
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ActiveGenerationsProbe />
      </QueryClientProvider>
    );
    const query = client.getQueryCache().getAll()[0];
    expect(query).toBeDefined();
    if (!query) {
      throw new Error("Missing active generations query");
    }
    const options = query.options as QueryObserverOptions;
    const interval = options.refetchInterval;
    if (typeof interval !== "function") {
      throw new Error("Expected adaptive polling");
    }
    expect(interval(query)).toBe(15_000);
    query.setData({ generations: [], results: [] });
    expect(interval(query)).toBe(15_000);
    query.setData({ generations: [{ runId: "external-run" }], results: [] });
    expect(interval(query)).toBe(3000);
    query.setData({ generations: [], results: [] });
    expect(interval(query)).toBe(15_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

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
