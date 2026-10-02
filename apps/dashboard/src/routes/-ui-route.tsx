import { createRoute, type Router } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { getTranslations } from "@/lib/i18n/server";
import type {
  UiRouteFactoryOptions,
  UiRouteSearch,
  UiRouteTitle,
  UiPageParams,
} from "@/types/migration-routes";

const loadTitle = createServerFn({ method: "GET" })
  .inputValidator((data: UiRouteTitle) => data)
  .handler(async ({ data }) => {
    if (!data.namespace || !data.key) {
      return {
        title: data.title,
        description: undefined as string | undefined,
      };
    }
    const t = await getTranslations(data.namespace as never);
    return {
      title: t(data.key as never),
      description: data.descriptionKey
        ? t(data.descriptionKey as never)
        : undefined,
    };
  });

export function uiRouteSearch(search: Record<string, unknown>): UiRouteSearch {
  return Object.fromEntries(
    Object.entries(search).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, value.map(String)];
      }
      return [
        key,
        value === undefined || value === null ? undefined : String(value),
      ];
    })
  );
}

export function uiPageParams(
  params: Record<string, string | undefined>
): UiPageParams {
  return {
    slug: params.slug ?? "",
    id: params.id ?? "",
    name: params.name ?? "",
    chatId: params.chatId ?? "",
    handle: params.handle ?? "",
    competitor: params.competitor ?? "",
    integrationSlug: params.integrationSlug ?? "",
  };
}

export function createUiRoute<T = undefined>({
  parent,
  path,
  component: Page,
  loader,
  pendingComponent,
  title,
  pageTitle,
}: UiRouteFactoryOptions<T>) {
  const route = createRoute({
    getParentRoute: () => parent,
    path,
    validateSearch: uiRouteSearch,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ params, deps }) => {
      const input = { params, searchParams: deps.search };
      const [data, metadata] = await Promise.all([
        loader?.(input),
        title ? loadTitle({ data: title }) : undefined,
      ]);
      return { data, metadata };
    },
    head: ({ loaderData }) => {
      const pageHeading =
        loaderData && pageTitle
          ? pageTitle(loaderData.data as T)
          : loaderData?.metadata?.title;
      return {
        meta: [
          ...(pageHeading ? [{ title: `${pageHeading} - Notra` }] : []),
          ...(loaderData?.metadata?.description
            ? [
                {
                  name: "description",
                  content: loaderData.metadata.description,
                },
              ]
            : []),
        ],
      };
    },
    pendingComponent,
  });
  function UiPage() {
    const { data } = route.useLoaderData<Router<typeof route>>();
    const params = route.useParams<Router<typeof route>>();
    const searchParams = route.useSearch<Router<typeof route>>();
    return (
      <Page
        data={data as T}
        params={uiPageParams(params)}
        searchParams={searchParams}
      />
    );
  }
  return route.update({ component: UiPage });
}
