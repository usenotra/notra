import { jsonError } from "@/utils/api-response";

export const runtime = "nodejs";

export function POST() {
  return jsonError("Applications are currently closed", 503);
}
