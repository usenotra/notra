import type { WithSupermemoryOptions } from "@supermemory/tools/ai-sdk";

export interface SupermemoryOptions extends Omit<
  WithSupermemoryOptions,
  "containerTag" | "customId"
> {
  customId?: string;
}
