import { describe, expect, test } from "bun:test";

import { Effect } from "effect";

import { SkillUpgradeInputError } from "../errors";
import type { SkillUpstreamLatest, SkillUpstreamSubject } from "../types";
import {
  deriveSkillUpstreamStatus,
  getSkillUpstream,
  listSkillUpstreamStatuses,
  updateSkillContent,
  upgradeSkill,
} from "./upstream";

const BASE_VERSION = 3;
const LATEST_VERSION = 4;

function version(
  overrides: Partial<SkillUpstreamLatest> = {}
): SkillUpstreamLatest {
  return {
    name: "humanizer",
    version: BASE_VERSION,
    description: "Upstream description",
    content: "Upstream content",
    changelog: null,
    ...overrides,
  };
}

function skill(
  overrides: Partial<SkillUpstreamSubject> = {}
): SkillUpstreamSubject {
  return {
    description: "Upstream description",
    content: "Upstream content",
    systemSkillVersionId: "base-id",
    ...overrides,
  };
}

describe("skill upstream effects", () => {
  test("all shared workflows return Effects without starting database work", () => {
    const context = { organizationId: "org" };

    expect(Effect.isEffect(getSkillUpstream(context, { id: "skill" }))).toBe(
      true
    );
    expect(Effect.isEffect(listSkillUpstreamStatuses(context))).toBe(true);
    expect(
      Effect.isEffect(
        updateSkillContent(context, { id: "skill" }, { content: "Updated" })
      )
    ).toBe(true);
    expect(
      Effect.isEffect(
        upgradeSkill(context, { id: "skill" }, { strategy: "keep" })
      )
    ).toBe(true);
  });

  test("shared domain errors are yieldable typed failures", async () => {
    const outcome = await Effect.runPromise(
      Effect.result(
        new SkillUpgradeInputError({
          skillName: "humanizer",
          reason: "content required",
        })
      )
    );

    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: {
        _tag: "SkillUpgradeInputError",
        skillName: "humanizer",
        reason: "content required",
      },
    });
  });
});

describe("deriveSkillUpstreamStatus", () => {
  test("current: unmodified copy on the latest version", () => {
    const base = version();

    expect(
      deriveSkillUpstreamStatus({ skill: skill(), base, latest: base })
    ).toEqual({
      systemName: "humanizer",
      baseVersion: BASE_VERSION,
      latestVersion: BASE_VERSION,
      isModified: false,
      updateAvailable: false,
      changelog: null,
    });
  });

  test("update-available: unmodified copy with a newer version published", () => {
    const status = deriveSkillUpstreamStatus({
      skill: skill(),
      base: version(),
      latest: version({
        version: LATEST_VERSION,
        content: "Next content",
        changelog: "Sharper examples",
      }),
    });

    expect(status.isModified).toBe(false);
    expect(status.updateAvailable).toBe(true);
    expect(status.baseVersion).toBe(BASE_VERSION);
    expect(status.latestVersion).toBe(LATEST_VERSION);
    expect(status.changelog).toBe("Sharper examples");
  });

  test("modified: edited copy on the latest version", () => {
    const base = version();
    const status = deriveSkillUpstreamStatus({
      skill: skill({ content: "My own content" }),
      base,
      latest: base,
    });

    expect(status.isModified).toBe(true);
    expect(status.updateAvailable).toBe(false);
  });

  test("conflict: edited copy and a newer version published", () => {
    const status = deriveSkillUpstreamStatus({
      skill: skill({ content: "My own content" }),
      base: version(),
      latest: version({ version: LATEST_VERSION, content: "Next content" }),
    });

    expect(status.isModified).toBe(true);
    expect(status.updateAvailable).toBe(true);
  });

  test("a description-only edit counts as modified", () => {
    const base = version();
    const status = deriveSkillUpstreamStatus({
      skill: skill({ description: "My own description" }),
      base,
      latest: base,
    });

    expect(status.isModified).toBe(true);
  });

  test("null base: an unbackfilled row reads against the lowest version", () => {
    const status = deriveSkillUpstreamStatus({
      skill: skill({
        systemSkillVersionId: null,
        content: "Content seeded from an older default",
      }),
      // Caller resolves the missing base to the lowest published version.
      base: version({ version: 1 }),
      latest: version({ version: LATEST_VERSION }),
    });

    expect(status.baseVersion).toBe(1);
    expect(status.isModified).toBe(true);
    expect(status.updateAvailable).toBe(true);
  });
});
