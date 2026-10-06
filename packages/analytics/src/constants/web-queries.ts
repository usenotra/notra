import { p } from "@tinybirdco/sdk";

import { GEO_HOSTS_PARAMS, GEO_HOSTS_SQL } from "./geo-queries";

export const WEB_SCOPE_PARAMS = {
  site_id: p
    .string()
    .optional("")
    .describe("Notra Site id, empty for every site and SDK host"),
  ...GEO_HOSTS_PARAMS,
};

export const WEB_SCOPE_SQL = `AND ({{String(site_id, '')}} = '' OR site_id = {{String(site_id, '')}})
          ${GEO_HOSTS_SQL}`;
