import { mock } from "bun:test";

import { createFormatter, createTranslator } from "next-intl";
import type { Messages, NamespaceKeys, NestedKeyOf } from "next-intl";
import type { ReactNode } from "react";

import messages from "../../messages/en.json";

const locale = "en";
const timeZone = "UTC";
type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

const translator = (namespace?: Namespace) =>
  createTranslator({ locale, messages, namespace, timeZone });
const formatter = () => createFormatter({ locale, timeZone });
const actual = await import("next-intl");
const actualServer = await import("next-intl/server");

mock.module("next-intl", () => ({
  ...actual,
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
  useFormatter: formatter,
  useLocale: () => locale,
  useMessages: () => messages,
  useNow: () => new Date(),
  useTimeZone: () => timeZone,
  useTranslations: translator,
}));

mock.module("next-intl/server", () => ({
  ...actualServer,
  getFormatter: async () => formatter(),
  getLocale: async () => locale,
  getMessages: async () => messages,
  getTranslations: async (namespace?: Namespace) => translator(namespace),
}));
