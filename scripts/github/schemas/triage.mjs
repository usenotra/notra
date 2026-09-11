import { priorities, types } from "../constants/labels.mjs";

export const triageSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: types },
    priority: { type: "string", enum: priorities },
    needs_triage: { type: "boolean" },
    reason: { type: "string", maxLength: 400 },
  },
  required: ["type", "priority", "needs_triage", "reason"],
};

export function validateTriage(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== triageSchema.required.length ||
    !triageSchema.required.every((key) => Object.hasOwn(value, key)) ||
    !types.includes(value.type) ||
    !priorities.includes(value.priority) ||
    typeof value.needs_triage !== "boolean" ||
    typeof value.reason !== "string" ||
    value.reason.length > 400
  ) {
    throw new Error("Invalid triage output");
  }
  return value;
}
