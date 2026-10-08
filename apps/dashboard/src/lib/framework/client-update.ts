import { defineHandler } from "nitro";

import { getClientUpdateResponse } from "../../utils/client-update-response";

export default defineHandler((event) => getClientUpdateResponse(event.req));
