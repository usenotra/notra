import { SMOKE_FIXTURE } from "../constants/smoke";

/** Called only after the CLI has validated both loopback URLs. */
export async function seedSmokeFixture(): Promise<void> {
  const [
    { db },
    { brandSettings, geoSettings, organizations, projects },
    { eq },
  ] = await Promise.all([
    import("@notra/db/drizzle"),
    import("@notra/db/schema"),
    import("drizzle-orm"),
  ]);
  try {
    await db.transaction(async (transaction) => {
      await transaction
        .insert(organizations)
        .values({
          id: SMOKE_FIXTURE.organizationId,
          name: SMOKE_FIXTURE.name,
          slug: SMOKE_FIXTURE.organizationId,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
      const [organization] = await transaction
        .select()
        .from(organizations)
        .where(eq(organizations.id, SMOKE_FIXTURE.organizationId));
      if (
        !organization ||
        organization.name !== SMOKE_FIXTURE.name ||
        ![SMOKE_FIXTURE.organizationId, "geo-smoke-test"].includes(
          organization.slug
        )
      ) {
        throw new Error(
          "Local smoke organization ID collides with existing data."
        );
      }
      await transaction
        .insert(brandSettings)
        .values({
          id: SMOKE_FIXTURE.brandId,
          organizationId: SMOKE_FIXTURE.organizationId,
          name: SMOKE_FIXTURE.name,
          isDefault: false,
          websiteUrl: SMOKE_FIXTURE.websiteUrl,
          companyName: "Notra",
        })
        .onConflictDoNothing();
      const [brand] = await transaction
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.id, SMOKE_FIXTURE.brandId));
      if (
        !brand ||
        brand.organizationId !== SMOKE_FIXTURE.organizationId ||
        brand.websiteUrl !== SMOKE_FIXTURE.websiteUrl ||
        brand.companyName !== "Notra"
      ) {
        throw new Error("Local smoke brand ID collides with existing data.");
      }
      await transaction
        .insert(projects)
        .values({
          id: SMOKE_FIXTURE.projectId,
          organizationId: SMOKE_FIXTURE.organizationId,
          name: SMOKE_FIXTURE.name,
          brandSettingsId: SMOKE_FIXTURE.brandId,
        })
        .onConflictDoNothing();
      const [project] = await transaction
        .select()
        .from(projects)
        .where(eq(projects.id, SMOKE_FIXTURE.projectId));
      if (
        !project ||
        project.organizationId !== SMOKE_FIXTURE.organizationId ||
        project.brandSettingsId !== SMOKE_FIXTURE.brandId ||
        project.name !== SMOKE_FIXTURE.name
      ) {
        throw new Error("Local smoke project ID collides with existing data.");
      }
      await transaction
        .insert(geoSettings)
        .values({
          id: SMOKE_FIXTURE.settingsId,
          organizationId: SMOKE_FIXTURE.organizationId,
          projectId: SMOKE_FIXTURE.projectId,
          companyName: "Notra",
        })
        .onConflictDoNothing();
      const [settings] = await transaction
        .select()
        .from(geoSettings)
        .where(eq(geoSettings.id, SMOKE_FIXTURE.settingsId));
      if (
        !settings ||
        settings.organizationId !== SMOKE_FIXTURE.organizationId ||
        settings.projectId !== SMOKE_FIXTURE.projectId ||
        settings.companyName !== "Notra"
      ) {
        throw new Error("Local smoke settings ID collides with existing data.");
      }
    });
  } catch {
    // Driver errors can include the connection string; do not print them.
    throw new Error(
      "Local smoke fixture could not be seeded. Check schema and fixture ID ownership."
    );
  }
}
