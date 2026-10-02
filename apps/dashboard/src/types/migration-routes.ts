import type { AnyRoute, RouteComponent } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

export type UiRouteSearch = Record<string, string | string[] | undefined>;

export interface UiRouteInput {
  params: Record<string, string>;
  searchParams: UiRouteSearch;
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
}

export interface UiRouteFactoryOptions<T> extends UiRouteOptions<T> {
  parent: AnyRoute;
}

export interface UiModalProviderProps {
  children: ReactNode;
}
