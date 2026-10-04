import { mock } from "bun:test";

import type { ReactNode } from "react";
import type { Messages, NamespaceKeys, NestedKeyOf } from "use-intl";
import { createFormatter, createTranslator } from "use-intl/core";

import messages from "../../messages/en.json";

const locale = "en";
const timeZone = "UTC";
type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

const translator = (namespace?: Namespace) =>
  createTranslator({ locale, messages, namespace, timeZone });
const formatter = () => createFormatter({ locale, timeZone });
const actual = await import("use-intl");

mock.module("use-intl", () => ({
  ...actual,
  IntlProvider: ({ children }: { children: ReactNode }) => children,
  useFormatter: formatter,
  useLocale: () => locale,
  useMessages: () => messages,
  useNow: () => new Date(),
  useTimeZone: () => timeZone,
  useTranslations: translator,
}));

mock.module("@/lib/i18n/server", () => ({
  getFormatter: async () => formatter(),
  getLocale: async () => locale,
  getMessages: async () => messages,
  getTranslations: async (namespace?: Namespace) => translator(namespace),
}));
