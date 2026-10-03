import type { Metadata } from "@/types/metadata";
import { SITE_DESCRIPTION, SITE_TITLE, pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const LANDING_PAGE_METADATA: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: pageAlternates(SITE_URL),
};
