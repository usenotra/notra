import { createRoute, type Router } from "@tanstack/react-router";
import { createTranslator } from "use-intl/core";

import { getCatalog } from "@/lib/i18n/catalog";
import type { DashboardLocale } from "@/types/i18n";
import type {
  UiRouteFactoryOptions,
  UiRouteSearch,
  UiRouteTitle,
  UiPageParams,
} from "@/types/migration-routes";

interface RootLoaderData {
  locale: DashboardLocale;
}

/**
 * Page titles come from the catalog the root route already loaded, so a
 * navigation never needs a server round trip just to translate its title.
 */
function translateTitle(title: UiRouteTitle, root: RootLoaderData | undefined) {
  const messages = root && getCatalog(root.locale);
  if (!(title.namespace && title.key && root && messages)) {
    return { title: title.title, description: undefined as string | undefined };
  }
  const t = createTranslator({
    locale: root.locale,
    messages,
    namespace: title.namespace as never,
  }) as unknown as (key: string) => string;
  return {
    title: t(title.key),
    description: title.descriptionKey ? t(title.descriptionKey) : undefined,
  };
}

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
      return { data: await loader?.(input) };
    },
    head: ({ loaderData, matches }) => {
      const metadata = title
        ? translateTitle(
            title,
            matches[0]?.loaderData as RootLoaderData | undefined
          )
        : undefined;
      const pageHeading =
        loaderData && pageTitle
          ? pageTitle(loaderData.data as T)
          : metadata?.title;
      return {
        meta: [
          ...(pageHeading ? [{ title: `${pageHeading} - Notra` }] : []),
          ...(metadata?.description
            ? [
                {
                  name: "description",
                  content: metadata.description,
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
