import type { UIMessage } from "ai";

export type AssistantMessagePart = UIMessage["parts"][number];

export interface AssistantPartRef<TPart = AssistantMessagePart> {
  part: TPart;
  index: number;
}

export type AssistantMessageSegment<TPart = AssistantMessagePart> =
  | {
      kind: "activity";
      startIndex: number;
      items: AssistantPartRef<TPart>[];
    }
  | {
      kind: "standalone";
      startIndex: number;
      index: number;
      part: TPart;
    };

export type AssistantActivityStackItem<TPart = AssistantMessagePart> =
  | {
      kind: "part";
      part: TPart;
      index: number;
    }
  | {
      kind: "searches";
      items: AssistantPartRef<TPart>[];
    };

export interface GroupAssistantMessagePartsOptions<
  TPart = AssistantMessagePart,
> {
  isStandaloneTool?: (part: TPart) => boolean;
}

export interface ChatSearchSource {
  url?: string;
  title: string;
  domain?: string;
}

export interface ChatActivityOptions extends GroupAssistantMessagePartsOptions {
  includeFileParts?: boolean;
}
