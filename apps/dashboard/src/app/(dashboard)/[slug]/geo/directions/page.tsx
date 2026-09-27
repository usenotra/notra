import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tGeoShared = await getTranslations("geo.shared");
  return { title: tGeoShared("geoDirections") };
}

export const instant = true;

function Page() {
  return <PageClient />;
}

export default Page;
