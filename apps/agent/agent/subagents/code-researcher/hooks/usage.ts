import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";

import { createUsageHook } from "../../../lib/hooks/usage";

export default createUsageHook(AGENT_DEFAULT_MODEL);
