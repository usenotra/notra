import type { AnyRoute, RouteComponent } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

export type UiRouteSearch = Record<string, string | string[] | undefined>;

export interface UiRouteInput {
  params: Record<string, string>;
  searchParams: UiRouteSearch;
  /** The route's gate already ran for this request (streamed first render). */
  gated?: boolean;
}

export interface UiPageParams extends Record<string, string> {
  slug: string;
  id: string;
  name: string;
  chatId: string;
  handle: string;
  competitor: string;
  integrationSlug: string;
}

export interface UiPageProps<T> {
  params: UiPageParams;
  searchParams: UiRouteSearch;
  data: T;
}

export interface UiRouteTitle {
  namespace?: string;
  key?: string;
  title?: string;
  descriptionKey?: string;
}

export interface UiRouteOptions<T> {
  path: string;
  component: ComponentType<UiPageProps<NoInfer<T>>>;
  loader?: (input: UiRouteInput) => Promise<T>;
  pendingComponent?: RouteComponent;
  title?: UiRouteTitle;
  pageTitle?: (data: T) => string;
  /**
   * Stream the page data into the first server-rendered document: the shell
   * and `pendingComponent` flush before `loader` resolves (like Next's
   * loading.tsx). Client navigations still await the loader.
   */
  stream?: boolean;
  /**
   * Awaited before a streamed loader starts, for redirects that must reach
   * the browser as HTTP redirects. The loader repeats them on client
   * navigations, so a gate never runs there.
   */
  gate?: (input: UiRouteInput) => Promise<unknown>;
}

export interface StreamedUiPageProps<T> extends Omit<UiPageProps<T>, "data"> {
  page: ComponentType<UiPageProps<T>>;
  pending: Promise<T>;
}

export interface UiRouteFactoryOptions<T> extends UiRouteOptions<T> {
  parent: AnyRoute;
}

export interface UiModalProviderProps {
  children: ReactNode;
}
