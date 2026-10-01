import { seedDemoBrand } from "@/lib/demo/seed/brand";
import { seedDemoContent } from "@/lib/demo/seed/content";
import { seedDemoGeo } from "@/lib/demo/seed/geo";
import {
  seedDemoAutomation,
  seedDemoGeoExtras,
  seedDemoSkills,
  seedDemoSocial,
  seedDemoTeam,
} from "@/lib/demo/seed/workspace-extras";
import type { DemoSeedContext } from "@/types/demo";

/**
 * Fills a fresh demo organization so no page starts empty. Every timestamp is
 * derived from `context.now` and the visitor's time zone.
 */
export async function seedDemoWorkspace(
  context: DemoSeedContext
): Promise<void> {
  await seedDemoBrand(context);
  // GEO needs the brand identity; content and personas hang off the project.
  const [projectId] = await Promise.all([
    seedDemoGeo(context),
    seedDemoTeam(context),
    seedDemoSkills(context),
    seedDemoAutomation(context),
    seedDemoSocial(context),
  ]);
  await Promise.all([
    seedDemoContent({ ...context, projectId }),
    seedDemoGeoExtras({ ...context, projectId }),
  ]);
}
