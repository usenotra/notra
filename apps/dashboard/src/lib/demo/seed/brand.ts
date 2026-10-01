import { db } from "@notra/db/drizzle";
import {
  brandGuidelineColors,
  brandGuidelineFonts,
  brandGuidelines,
  brandSettings,
} from "@notra/db/schema";

import {
  DEMO_SEED_BRAND,
  DEMO_SEED_BRAND_COLORS,
  DEMO_SEED_BRAND_FONTS,
} from "@/constants/demo-seed-brand";
import type { DemoSeedContext } from "@/types/demo";
import {
  demoCompanyDomain,
  personalizeDemoText,
} from "@/utils/demo-personalize";

export async function seedDemoBrand(context: DemoSeedContext) {
  const brandSettingsId = crypto.randomUUID();
  const guidelineId = crypto.randomUUID();
  const { now } = context;

  await db.insert(brandSettings).values({
    id: brandSettingsId,
    organizationId: context.organizationId,
    isDefault: true,
    ...DEMO_SEED_BRAND,
    name: context.companyName,
    companyName: context.companyName,
    websiteUrl: `https://${demoCompanyDomain(context.companyName)}`,
    companyDescription: personalizeDemoText(
      DEMO_SEED_BRAND.companyDescription,
      context.companyName
    ),
    customTone: personalizeDemoText(
      DEMO_SEED_BRAND.customTone,
      context.companyName
    ),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(brandGuidelines).values({
    id: guidelineId,
    brandSettingsId,
    status: "ready",
    contextDevMeta: { seed: "demo" },
    lastGeneratedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(brandGuidelineColors).values(
    DEMO_SEED_BRAND_COLORS.map((color, index) => ({
      id: crypto.randomUUID(),
      guidelineId,
      ...color,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    }))
  );
  await db.insert(brandGuidelineFonts).values(
    DEMO_SEED_BRAND_FONTS.map((font, index) => ({
      id: crypto.randomUUID(),
      guidelineId,
      ...font,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    }))
  );
}
