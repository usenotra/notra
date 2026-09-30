import { createUsageHook } from "../lib/hooks/usage";
import { getSelectedAssistantModelId } from "../lib/utils/model";

export default createUsageHook(getSelectedAssistantModelId);
