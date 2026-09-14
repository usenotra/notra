import { describe, expect, test } from "bun:test";

import {
  SkillDuplicateError as ServiceSkillDuplicateError,
  SkillNotFoundError as ServiceSkillNotFoundError,
  SkillNotSystemError as ServiceSkillNotSystemError,
  SkillUpgradeInputError as ServiceSkillUpgradeInputError,
  SystemSkillVersionMissingError as ServiceSystemSkillVersionMissingError,
} from "@notra/ai/skills/errors";
import {
  systemSkillVersionParamsSchema,
  upgradeSkillRequestSchema,
} from "@notra/schemas/api/skills";
import { getRequiredApiScope } from "@notra/utils/api-scopes";

import { mapSkillServiceError } from "../src/utils/skill-errors";

describe("upgradeSkillRequestSchema", () => {
  test("accepts discard and keep without content", () => {
    for (const strategy of ["discard", "keep"] as const) {
      expect(upgradeSkillRequestSchema.safeParse({ strategy }).success).toBe(
        true
      );
    }
  });

  test("rejects merge without usable content", () => {
    for (const body of [
      { strategy: "merge" },
      { strategy: "merge", content: "   " },
    ]) {
      const result = upgradeSkillRequestSchema.safeParse(body);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["content"]);
    }
  });

  test("accepts merge with content and an optional description", () => {
    const result = upgradeSkillRequestSchema.safeParse({
      strategy: "merge",
      content: "# Merged",
      description: "Merged description",
    });

    expect(result.success).toBe(true);
  });

  test("rejects an unknown strategy", () => {
    expect(
      upgradeSkillRequestSchema.safeParse({ strategy: "rebase" }).success
    ).toBe(false);
  });
});

describe("systemSkillVersionParamsSchema", () => {
  test("coerces the path segment into a positive integer", () => {
    const result = systemSkillVersionParamsSchema.safeParse({
      name: "humanizer",
      version: "3",
    });

    expect(result.data?.version).toBe(3);
  });

  test("rejects non-numeric and non-positive versions", () => {
    for (const version of ["abc", "0", "-1", "1.5"]) {
      expect(
        systemSkillVersionParamsSchema.safeParse({ name: "humanizer", version })
          .success
      ).toBe(false);
    }
  });
});

describe("mapSkillServiceError", () => {
  test("maps every service error onto its tagged API error", () => {
    const cases = [
      [
        new ServiceSkillNotFoundError({ skillName: "humanizer" }),
        "SkillNotFoundError",
      ],
      [
        new ServiceSkillDuplicateError({ skillName: "humanizer" }),
        "SkillDuplicateError",
      ],
      [
        new ServiceSkillNotSystemError({ skillName: "my-skill" }),
        "SkillNotSystemError",
      ],
      [
        new ServiceSystemSkillVersionMissingError({ skillName: "humanizer" }),
        "SystemSkillVersionNotFoundError",
      ],
      [
        new ServiceSkillUpgradeInputError({
          skillName: "humanizer",
          reason: "content required",
        }),
        "SkillUpgradeInputError",
      ],
    ] as const;

    for (const [cause, tag] of cases) {
      expect(mapSkillServiceError(cause)._tag).toBe(tag);
    }
  });

  test("carries the skill name and the upgrade reason across the boundary", () => {
    const duplicate = mapSkillServiceError(
      new ServiceSkillDuplicateError({ skillName: "humanizer" })
    );
    const invalid = mapSkillServiceError(
      new ServiceSkillUpgradeInputError({
        skillName: "humanizer",
        reason: "content required",
      })
    );

    expect(duplicate).toMatchObject({ name: "humanizer" });
    expect(invalid).toMatchObject({ reason: "content required" });
  });

  test("unknown failures stay database errors so Hono answers 500", () => {
    expect(mapSkillServiceError(new Error("connection reset"))._tag).toBe(
      "SkillDatabaseError"
    );
  });
});

describe("system skill scopes", () => {
  test("the registry reads with skills.read and upgrades write", () => {
    expect(getRequiredApiScope("/v1/system-skills", "GET")).toBe("skills.read");
    expect(getRequiredApiScope("/v1/system-skills/humanizer", "GET")).toBe(
      "skills.read"
    );
    expect(
      getRequiredApiScope("/v1/system-skills/humanizer/versions/2", "GET")
    ).toBe("skills.read");
    expect(getRequiredApiScope("/v1/skills/humanizer/upgrade", "POST")).toBe(
      "skills.write"
    );
  });
});
