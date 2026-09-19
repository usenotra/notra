import { describe, expect, test } from "bun:test";

import {
  ACTIVE_GENERATIONS_IDLE_POLL_MS,
  ACTIVE_GENERATIONS_POLL_MS,
  activeGenerationsPollInterval,
} from "../src/utils/active-generations-poll";

describe("activeGenerationsPollInterval", () => {
  test("polls slowly when nothing is generating", () => {
    expect(activeGenerationsPollInterval(undefined)).toBe(
      ACTIVE_GENERATIONS_IDLE_POLL_MS
    );
    expect(activeGenerationsPollInterval([])).toBe(
      ACTIVE_GENERATIONS_IDLE_POLL_MS
    );
  });

  test("polls while generations are in flight", () => {
    expect(activeGenerationsPollInterval([{ id: "run-1" }])).toBe(
      ACTIVE_GENERATIONS_POLL_MS
    );
  });
});
