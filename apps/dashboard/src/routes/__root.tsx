import "@/lib/analytics/client-init";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { use } from "react";
import { IntlProvider } from "use-intl";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";

import { NotFoundContent } from "@/components/not-found-content";
import {
  catalogPreloadLinks,
  getCatalog,
  loadCatalog,
} from "@/lib/i18n/catalog";
import { getLocale } from "@/lib/i18n/server";
import { Providers } from "@/utils/providers";

import styles from "@/styles/globals.css?url";

const loadLocale = createServerFn({ method: "GET" }).handler(async () => ({
  locale: await getLocale(),
}));

export const Route = createRootRoute({
  validateSearch: (search: Record<string, unknown>) => search,
  loader: async () => {
    const { locale } = await loadLocale();
    await loadCatalog(locale);
    return { locale };
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Notra" },
      { name: "description", content: "Notra - Content Management" },
      { name: "apple-mobile-web-app-title", content: "Notra" },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: "#ffffff",
      },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: "#09090b",
      },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      ...catalogPreloadLinks(loaderData?.locale),
      { rel: "icon", href: "/favicon.ico" },
      { rel: "icon", href: "/icon0.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-icon.png" },
    ],
  }),
  component: Root,
  notFoundComponent: () => <NotFoundContent className="min-h-[100svh]" />,
});

function Root() {
  const { locale } = Route.useLoaderData();
  const messages = getCatalog(locale) ?? use(loadCatalog(locale));
  return (
    <html className="dark:scheme-dark" lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <Providers>
            <Outlet />
          </Providers>
        </IntlProvider>
        <Scripts />
      </body>
    </html>
  );
}
