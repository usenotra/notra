import { beforeEach, describe, expect, mock, test } from "bun:test";

const getGeoIngestTokenGeneration = mock(
  async (
    _organizationId: string,
    _projectId?: string | null
  ): Promise<number | null> => 1
);
const redisGet = mock(() => new Promise<null>(() => {}));
const redisSet = mock(async () => "OK");
const findProject = mock(async () => ({ id: "proj_1" }));

mock.module("@notra/geo-core/geo/ingest", () => ({
  getGeoIngestTokenGeneration,
}));
mock.module("@notra/ai/utils/redis", () => ({
  redis: { get: redisGet, set: redisSet },
}));
mock.module("@notra/db/drizzle", () => ({
  db: { query: { projects: { findFirst: findProject } } },
}));

const { isGeoIngestIdentityActive } = await import("../src/ingest/identity");

describe("ingest identity", () => {
  beforeEach(() => {
    getGeoIngestTokenGeneration.mockClear();
    getGeoIngestTokenGeneration.mockImplementation(async () => 1);
    redisGet.mockClear();
    redisSet.mockClear();
    findProject.mockClear();
  });

  test.each(["proj_1", null])(
    "checks generation once without a Redis wait or duplicate project lookup (%s)",
    async (projectId) => {
      expect(
        await isGeoIngestIdentityActive({
          organizationId: "org_1",
          projectId,
          generation: 1,
        })
      ).toBe(true);
      expect(getGeoIngestTokenGeneration).toHaveBeenCalledTimes(1);
      expect(getGeoIngestTokenGeneration).toHaveBeenCalledWith(
        "org_1",
        projectId
      );
      expect(redisGet).not.toHaveBeenCalled();
      expect(redisSet).not.toHaveBeenCalled();
      expect(findProject).not.toHaveBeenCalled();
    }
  );

  test.each([null, 2])(
    "rejects missing or revoked identities (%s)",
    async (generation) => {
      getGeoIngestTokenGeneration.mockImplementation(async () => generation);
      expect(
        await isGeoIngestIdentityActive({
          organizationId: "org_1",
          projectId: "proj_1",
          generation: 1,
        })
      ).toBe(false);
    }
  );

  test("fails closed when Postgres is unavailable", async () => {
    getGeoIngestTokenGeneration.mockImplementation(async () => {
      throw new Error("database unavailable");
    });
    expect(
      await isGeoIngestIdentityActive({
        organizationId: "org_1",
        projectId: "proj_1",
        generation: 1,
      })
    ).toBe(false);
  });
});
