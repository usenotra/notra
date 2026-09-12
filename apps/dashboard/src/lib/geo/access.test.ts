import { beforeEach, describe, expect, mock, test } from "bun:test";

const assertOrganizationAccess = mock(async () => {});
const assertGeoEntitlement = mock(async () => {});

mock.module("@/lib/auth/organization", () => ({
  assertOrganizationAccess,
}));
mock.module("@/lib/billing/subscription", () => ({
  assertGeoEntitlement,
}));

const { assertGeoAccess } = await import("./access");

const params = {
  headers: new Headers(),
  organizationId: "org_1",
};

describe("assertGeoAccess", () => {
  beforeEach(() => {
    assertOrganizationAccess.mockClear();
    assertGeoEntitlement.mockClear();
    assertOrganizationAccess.mockImplementation(async () => {});
    assertGeoEntitlement.mockImplementation(async () => {});
  });

  test("does not start the billing lookup until membership is confirmed", async () => {
    let releaseMembership: () => void = () => {};
    assertOrganizationAccess.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseMembership = resolve;
        })
    );

    const pending = assertGeoAccess(params);
    await Promise.resolve();

    expect(assertGeoEntitlement).not.toHaveBeenCalled();
    releaseMembership();
    await pending;

    expect(assertGeoEntitlement).toHaveBeenCalledTimes(1);
    expect(assertGeoEntitlement).toHaveBeenCalledWith(
      params.organizationId,
      params.headers
    );
  });

  test("skips the billing lookup when membership fails", async () => {
    const forbidden = new Error("forbidden");
    assertOrganizationAccess.mockImplementation(async () => {
      throw forbidden;
    });

    await expect(assertGeoAccess(params)).rejects.toBe(forbidden);
    expect(assertGeoEntitlement).not.toHaveBeenCalled();
  });
});
