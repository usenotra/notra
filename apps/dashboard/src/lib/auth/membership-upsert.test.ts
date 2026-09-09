import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";

import { MEMBERSHIP_CONFLICT_TARGET_RETRY_MS } from "@/constants/auth/membership";
import {
  hasMissingConflictTargetCode,
  resetMembershipUpsertState,
  runMembershipUpsert,
} from "@/lib/auth/membership-upsert";
import type { MembershipUpsertInput } from "@/types/auth/membership";

const input: MembershipUpsertInput = {
  organizationId: "org-1",
  userId: "user-1",
  role: "member",
  createdAt: new Date("2026-09-09T00:00:00Z"),
};

const missingIndexError = Object.assign(new Error("Failed query"), {
  cause: Object.assign(new Error("no unique constraint"), { code: "42P10" }),
});

describe("hasMissingConflictTargetCode", () => {
  test("finds the Postgres code anywhere in the cause chain", () => {
    expect(hasMissingConflictTargetCode(missingIndexError)).toBe(true);
    expect(hasMissingConflictTargetCode({ code: "42P10" })).toBe(true);
  });

  test("ignores other errors", () => {
    expect(hasMissingConflictTargetCode(new Error("boom"))).toBe(false);
    expect(hasMissingConflictTargetCode({ code: "23505" })).toBe(false);
    expect(hasMissingConflictTargetCode(null)).toBe(false);
  });
});

describe("runMembershipUpsert", () => {
  beforeEach(() => {
    resetMembershipUpsertState();
    setSystemTime(input.createdAt);
  });

  afterEach(() => {
    setSystemTime();
    resetMembershipUpsertState();
  });

  test("uses the atomic upsert when the unique index exists", async () => {
    const atomic = mock(async () => {});
    const readThenWrite = mock(async () => {});
    await runMembershipUpsert({ atomic, readThenWrite }, input);
    expect(atomic).toHaveBeenCalledTimes(1);
    expect(readThenWrite).not.toHaveBeenCalled();
  });

  test("falls back once the missing index is detected and remembers it", async () => {
    const atomic = mock(async () => {
      throw missingIndexError;
    });
    const readThenWrite = mock(async () => {});
    const onFallback = mock(() => {});
    await runMembershipUpsert({ atomic, readThenWrite, onFallback }, input);
    await runMembershipUpsert({ atomic, readThenWrite, onFallback }, input);
    expect(atomic).toHaveBeenCalledTimes(1);
    expect(readThenWrite).toHaveBeenCalledTimes(2);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  test("retries at expiry and stays atomic after the migration", async () => {
    const atomic = mock(async () => {});
    atomic.mockRejectedValueOnce(missingIndexError);
    const readThenWrite = mock(async () => {});
    const onFallback = mock(() => {});
    const strategies = { atomic, readThenWrite, onFallback };

    await runMembershipUpsert(strategies, input);
    setSystemTime(
      input.createdAt.getTime() + MEMBERSHIP_CONFLICT_TARGET_RETRY_MS - 1
    );
    await runMembershipUpsert(strategies, input);
    expect(atomic).toHaveBeenCalledTimes(1);
    expect(readThenWrite).toHaveBeenCalledTimes(2);

    setSystemTime(
      input.createdAt.getTime() + MEMBERSHIP_CONFLICT_TARGET_RETRY_MS
    );
    await runMembershipUpsert(strategies, input);
    await runMembershipUpsert(strategies, input);
    expect(atomic).toHaveBeenCalledTimes(3);
    expect(readThenWrite).toHaveBeenCalledTimes(2);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  test("renews the retry interval when the index is still missing", async () => {
    const atomic = mock(async () => {
      throw missingIndexError;
    });
    const readThenWrite = mock(async () => {});
    const onFallback = mock(() => {});
    const strategies = { atomic, readThenWrite, onFallback };

    await runMembershipUpsert(strategies, input);
    setSystemTime(
      input.createdAt.getTime() + MEMBERSHIP_CONFLICT_TARGET_RETRY_MS
    );
    await runMembershipUpsert(strategies, input);
    setSystemTime(
      input.createdAt.getTime() + 2 * MEMBERSHIP_CONFLICT_TARGET_RETRY_MS - 1
    );
    await runMembershipUpsert(strategies, input);
    expect(atomic).toHaveBeenCalledTimes(2);
    expect(readThenWrite).toHaveBeenCalledTimes(3);
    expect(onFallback).toHaveBeenCalledTimes(2);

    setSystemTime(
      input.createdAt.getTime() + 2 * MEMBERSHIP_CONFLICT_TARGET_RETRY_MS
    );
    await runMembershipUpsert(strategies, input);
    expect(atomic).toHaveBeenCalledTimes(3);
  });

  test("propagates unrelated retry errors and retries again without caching them", async () => {
    const failure = new Error("connection reset");
    const atomic = mock(async () => {});
    atomic
      .mockRejectedValueOnce(missingIndexError)
      .mockRejectedValueOnce(failure);
    const readThenWrite = mock(async () => {});
    const strategies = { atomic, readThenWrite };

    await runMembershipUpsert(strategies, input);
    setSystemTime(
      input.createdAt.getTime() + MEMBERSHIP_CONFLICT_TARGET_RETRY_MS
    );
    await expect(runMembershipUpsert(strategies, input)).rejects.toBe(failure);
    await runMembershipUpsert(strategies, input);
    expect(atomic).toHaveBeenCalledTimes(3);
    expect(readThenWrite).toHaveBeenCalledTimes(1);
  });

  test("rethrows unrelated failures without falling back", async () => {
    const failure = new Error("connection reset");
    const atomic = mock(async () => {
      throw failure;
    });
    const readThenWrite = mock(async () => {});
    await expect(
      runMembershipUpsert({ atomic, readThenWrite }, input)
    ).rejects.toBe(failure);
    expect(readThenWrite).not.toHaveBeenCalled();
  });
});
