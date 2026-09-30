import { markdownResponse } from "@/utils/http";
import { buildDeveloperLlmsText } from "@/utils/llms";

export function GET() {
  return markdownResponse(buildDeveloperLlmsText());
}
