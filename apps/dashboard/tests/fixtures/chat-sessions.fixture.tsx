import { beforeEach, expect, mock, test } from "bun:test";

import { chatSessionsQueryKey } from "@notra/ai/utils/chat";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";

const projectsState = {
  projects: [{ id: "project-one" }],
  isLoading: true,
  isError: false,
  isReady: false,
};

mock.module("@/components/providers/organization-provider", () => ({
  useOrganizationsContext: () => ({
    activeOrganization: { id: "org-one", slug: "workspace-one" },
  }),
}));
mock.module("@/lib/hooks/use-geo-db", () => ({
  useGeoProjectsDb: () => projectsState,
}));
mock.module("@/lib/hooks/use-geo-project-query", () => ({
  useGeoProjectQueryState: () => [null],
}));
mock.module("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { useChatSessions } =
  await import("../../src/lib/hooks/use-chat-sessions");
const { useActiveProject } =
  await import("../../src/lib/hooks/use-active-project");

function readState(client: QueryClient) {
  function Probe() {
    const project = useActiveProject();
    const { isLoading, isError } = useChatSessions();
    return (
      <script type="application/json">
        {JSON.stringify({ project, sessions: { isLoading, isError } })}
      </script>
    );
  }
  const markup = renderToString(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>
  );
  return JSON.parse(
    markup.slice(markup.indexOf(">") + 1, markup.lastIndexOf("</script>"))
  );
}

beforeEach(() => {
  projectsState.isLoading = true;
  projectsState.isError = false;
  projectsState.isReady = false;
  projectsState.projects = [{ id: "project-one" }];
});

test("pending projects show a loading state without resolving the project", () => {
  const result = readState(new QueryClient());
  expect(result.project.isResolved).toBe(false);
  expect(result.sessions.isLoading).toBe(true);
  expect(result.sessions.isError).toBe(false);
});

test("failed projects stay unresolved and replace loading with an error", () => {
  projectsState.isError = true;
  projectsState.isReady = true;
  projectsState.isLoading = false;
  projectsState.projects = [];
  const client = new QueryClient();
  const result = readState(client);
  expect(result.project).toEqual({
    projectId: null,
    isResolved: false,
    isError: true,
  });
  expect(result.sessions.isLoading).toBe(false);
  expect(result.sessions.isError).toBe(true);
  expect(
    client.getQueryState(chatSessionsQueryKey("org-one", null))?.fetchStatus
  ).toBe("idle");
});

test("a successful empty project list resolves the organization scope", () => {
  projectsState.isLoading = false;
  projectsState.isReady = true;
  projectsState.projects = [];
  const client = new QueryClient();
  client.setQueryData(chatSessionsQueryKey("org-one", null), []);
  const result = readState(client);
  expect(result.project).toEqual({
    projectId: null,
    isResolved: true,
    isError: false,
  });
  expect(result.sessions.isLoading).toBe(false);
  expect(result.sessions.isError).toBe(false);
});

test("session request failures are not disguised as empty successful lists", async () => {
  projectsState.isLoading = false;
  projectsState.isReady = true;
  const client = new QueryClient({
    defaultOptions: { queries: { retryOnMount: false } },
  });
  await client
    .fetchQuery({
      queryKey: chatSessionsQueryKey("org-one", "project-one"),
      queryFn: () => Promise.reject(new Error("Session lookup failed")),
      retry: false,
    })
    .catch(() => undefined);
  const result = readState(client);
  expect(result.sessions.isLoading).toBe(false);
  expect(result.sessions.isError).toBe(true);
});
