import type { ScheduleOutputType } from "@notra/schemas/dashboard/integrations";

const AUTO_PUBLISH_SUPPORTED: ScheduleOutputType[] = ["changelog", "blog_post"];

export function supportsAutoPublish(outputType: ScheduleOutputType): boolean {
  return AUTO_PUBLISH_SUPPORTED.includes(outputType);
}
