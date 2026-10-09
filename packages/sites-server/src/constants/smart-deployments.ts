export const SMART_DEPLOYMENT_SKIP_REASON =
  "Site inputs are unchanged from the published version.";
export const SMART_DEPLOYMENT_QUESTIONS = {
  inputs_changed: {
    type: "boolean" as const,
    instructions:
      "According to the verified compiler-input comparison, have the site's build inputs changed? Use verifiedInputsChanged as the authoritative result.",
  },
};
