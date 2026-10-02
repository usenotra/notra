import { Databuddy, FlagsProvider } from "@databuddy/sdk/react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { buildPrefetchScript } from "c15t";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { ConsentManager } from "@/components/consent-manager";
import NotFound from "@/components/not-found-page";
import { ThemeProvider } from "@/components/theme-provider";
import { RSS_FEED_PATH, RSS_FEED_TITLE } from "@/utils/constants";

import globalsCss from "@/styles/globals.css?url";

const databuddyClientId = import.meta.env.NEXT_PUBLIC_DATABUDDY_WEB_WEBSITE_ID;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "apple-mobile-web-app-title", content: "Notra" },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "120x120",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        rel: "alternate",
        href: RSS_FEED_PATH,
        title: RSS_FEED_TITLE,
        type: "application/rss+xml",
      },
    ],
    scripts: [
      {
        id: "c15t-initial-data-prefetch",
        children: buildPrefetchScript({ backendURL: "/api/c15t" }),
      },
    ],
  }),
  component: Outlet,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      style={{ scrollbarGutter: "stable" }}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <meta
          content="#f7f5f3"
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content="#1f1a17"
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <FlagsProvider
            clientId={databuddyClientId ?? ""}
            disabled={!databuddyClientId}
          >
            {databuddyClientId && (
              <Databuddy
                clientId={databuddyClientId}
                trackAttributes={true}
                trackErrors={true}
                trackHashChanges={true}
              />
            )}
            <ConsentManager>
              <NuqsAdapter>{children}</NuqsAdapter>
            </ConsentManager>
          </FlagsProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
