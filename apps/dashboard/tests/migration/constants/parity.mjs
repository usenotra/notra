export const FIXTURE = {
  email: "migration-owner@example.invalid",
  userId: "migration_user_owner",
  slug: "migration-test",
  otherSlug: "migration-other",
  organizationId: "migration_org_owned",
  otherOrganizationId: "migration_org_other",
};

export const ANONYMOUS_CONTRACTS = [
  { path: "/api/healthcheck", status: 200 },
  { path: "/robots.txt", status: 200 },
  { path: "/favicon.ico", status: 200 },
  { path: "/api/cron/geo-scan", status: 401 },
  {
    path: "/rpc/user/organizations/listOwned",
    status: 401,
    method: "POST",
    body: '{"json":null}',
  },
];
