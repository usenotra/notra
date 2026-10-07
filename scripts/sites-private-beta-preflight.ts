import { SITES_PRIVATE_BETA_REQUIRED_ENV } from "../packages/sites-server/src/constants/private-beta";

let failed = false;
for (const name of SITES_PRIVATE_BETA_REQUIRED_ENV) {
  const configured = Boolean(process.env[name]?.trim());
  console.log(`${configured ? "OK" : "MISSING"} ${name}`);
  failed ||= !configured;
}
if (
  process.env.SITES_PREVIEW_SECRET &&
  Buffer.byteLength(process.env.SITES_PREVIEW_SECRET) < 32
) {
  console.error(
    "INVALID SITES_PREVIEW_SECRET: use at least 32 random bytes of secret material"
  );
  failed = true;
}
if (process.env.DEV_HOST_OVERRIDE_TOKEN) {
  console.error(
    "INVALID DEV_HOST_OVERRIDE_TOKEN: do not deploy a development bypass to production"
  );
  failed = true;
}
if (
  process.env.SITES_HOSTING_PROTOCOL === "http" ||
  process.env.SITES_HOSTING_PORT ||
  process.env.SITES_HOSTING_DOMAIN?.includes("localhost")
) {
  console.error(
    "INVALID hosting configuration: production needs HTTPS, no development port and no localhost domain"
  );
  failed = true;
}
console.log(
  "Worker bindings, matching secrets, DNS/TLS, SaaS activation and the workspace flag still require live verification."
);
const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
try {
  if (!dashboardUrl || new URL(dashboardUrl).protocol !== "https:") {
    throw new Error("Invalid dashboard origin");
  }
} catch {
  console.error(
    "INVALID dashboard URL: configure a production HTTPS APP_URL or NEXT_PUBLIC_APP_URL"
  );
  failed = true;
}
process.exitCode = failed ? 1 : 0;
