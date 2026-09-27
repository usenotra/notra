import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return {
    title: {
      template: "%s - Notra",
      default: t("metaTitle"),
    },
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy gates the session; the [slug] layout checks membership and bans.
  return children;
}
