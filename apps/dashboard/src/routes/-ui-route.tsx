import { createRoute, type Router } from "@tanstack/react-router";
import { createElement, Suspense, use } from "react";
import { createTranslator } from "use-intl/core";

import { getCatalog } from "@/lib/i18n/catalog";
import type { DashboardLocale } from "@/types/i18n";
import type {
  StreamedUiPageProps,
  UiRouteFactoryOptions,
  UiRouteSearch,
  UiRouteTitle,
  UiPageParams,
} from "@/types/ui-route";

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

function StreamedUiPage<T>({
  page: Page,
  pending,
  ...props
}: StreamedUiPageProps<T>) {
  return <Page data={use(pending)} {...props} />;
}

export function createUiRoute<T = undefined>({
  parent,
  path,
  component: Page,
  loader,
  pendingComponent,
  title,
  pageTitle,
  stream,
  gate,
  preload,
  loaderSearchKeys,
}: UiRouteFactoryOptions<T>) {
  const route = createRoute({
    getParentRoute: () => parent,
    path,
    validateSearch: uiRouteSearch,
    loaderDeps: ({ search }) => ({
      search: loaderSearchKeys
        ? Object.fromEntries(
            loaderSearchKeys.map((key) => [key, search[key]] as const)
          )
        : search,
    }),
    loader: async ({ params, location }) => {
      const input = {
        params,
        searchParams: uiRouteSearch(location.search as Record<string, unknown>),
      };
      if (stream && loader && (import.meta.env.SSR || gate)) {
        await gate?.(input);
        return {
          data: undefined,
          pending: loader({ ...input, gated: gate !== undefined }),
        };
      }
      return { data: await loader?.(input), pending: undefined };
    },
    head: ({ loaderData, matches }) => {
      const metadata = title
        ? translateTitle(
            title,
            matches[0]?.loaderData as RootLoaderData | undefined
          )
        : undefined;
      const pageHeading =
        loaderData?.data !== undefined && pageTitle
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
    const { data, pending } = route.useLoaderData<Router<typeof route>>();
    const params = route.useParams<Router<typeof route>>();
    const searchParams = route.useSearch<Router<typeof route>>();
    if (pending) {
      return (
        <Suspense
          fallback={pendingComponent ? createElement(pendingComponent) : null}
        >
          <StreamedUiPage
            page={Page}
            params={uiPageParams(params)}
            pending={pending as Promise<T>}
            searchParams={searchParams}
          />
        </Suspense>
      );
    }
    return (
      <Page
        data={data as T}
        params={uiPageParams(params)}
        searchParams={searchParams}
      />
    );
  }
  // The router calls `component.preload` while the route preloads or loads.
  const preloadPage =
    preload ?? (Page as { preload?: () => Promise<unknown> }).preload;
  const preloadPending = (
    pendingComponent as { preload?: () => Promise<unknown> } | undefined
  )?.preload;
  if (preloadPage || preloadPending) {
    Object.assign(UiPage, {
      preload: () => Promise.all([preloadPage?.(), preloadPending?.()]),
    });
  }
  return route.update({ component: UiPage });
}
