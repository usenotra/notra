"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { ScrollArea } from "@notra/ui/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { useCallback, useRef, useState } from "react";
import ChatInput, { type TextSelection } from "@/components/chat-input";
import { cn } from "@notra/ui/lib/utils";

// Default markdown document for testing
const DEFAULT_MARKDOWN = `# Product Update - January 2026

We're excited to share the latest updates to our platform.

## New Features

- **AI-powered content generation** - Create drafts instantly
- **Team collaboration** - Real-time editing with your team
- **Analytics dashboard** - Track content performance

## What's Next

We're working on exciting new features including:

1. Advanced scheduling
2. Multi-language support
3. Custom integrations

Stay tuned for more updates!
`;

// Preset prompts for testing
const PRESET_PROMPTS = {
  complex: {
    label: "Complex Prompt",
    description: "Multi-step task requiring tool use and reasoning",
    prompt: `Analyze this document and make the following changes:
1. Update the title to mention Q1 2026 specifically
2. Add a new section called "Key Metrics" after "New Features" with 3 bullet points about performance improvements (make up realistic metrics)
3. Rewrite the "What's Next" section to be more specific about Q1 2026 timeline
4. Add a conclusion paragraph at the end

Before making changes, read the current document to understand its structure.`,
  },
  simple: {
    label: "Simple Prompt",
    description: "Single focused task",
    prompt: "Make this about Our Q1 2026 projections",
  },
};

interface MessagePartProps {
  part: Record<string, unknown>;
  index: number;
}

function MessagePart({ part, index }: MessagePartProps) {
  const [isOpen, setIsOpen] = useState(true);
  const partType = part.type as string;

  // Text part
  if (partType === "text") {
    const text = part.text as string;
    if (!text?.trim()) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Text
          </Badge>
          <span className="text-muted-foreground text-xs">Part {index + 1}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm">{text}</p>
      </div>
    );
  }

  // Tool call part
  if (partType.startsWith("tool-")) {
    const toolName = partType.replace("tool-", "");
    const toolPart = part as {
      toolCallId?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
    };

    const stateColors: Record<string, string> = {
      "input-streaming": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      "input-available": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "output-available": "bg-green-500/10 text-green-600 border-green-500/20",
    };

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border border-border bg-card">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Badge className="font-mono text-xs">
                {toolName}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", stateColors[toolPart.state ?? ""] ?? "")}
              >
                {toolPart.state?.replace("-", " ")}
              </Badge>
              <span className="text-muted-foreground text-xs">
                Part {index + 1}
              </span>
            </div>
            <svg
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border p-3 space-y-3">
              {toolPart.toolCallId && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Tool Call ID</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {toolPart.toolCallId}
                  </code>
                </div>
              )}
              {toolPart.input !== undefined && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Input</p>
                  <div className="max-h-64 overflow-auto rounded-lg">
                    <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap break-all">
                      {JSON.stringify(toolPart.input, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {toolPart.output !== undefined && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Output</p>
                  <div className="max-h-64 overflow-auto rounded-lg">
                    <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap break-all">
                      {JSON.stringify(toolPart.output, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Reasoning/thinking part
  if (partType === "reasoning" || partType === "thinking") {
    const text = (part.text ?? part.content) as string;
    return (
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
            Thinking
          </Badge>
          <span className="text-muted-foreground text-xs">Part {index + 1}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-purple-900 dark:text-purple-100">
          {text}
        </p>
      </div>
    );
  }

  // Unknown part type - show raw
  return (
    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
          {partType}
        </Badge>
        <span className="text-muted-foreground text-xs">Part {index + 1}</span>
      </div>
      <pre className="text-xs overflow-x-auto">
        {JSON.stringify(part, null, 2)}
      </pre>
    </div>
  );
}

interface PageClientProps {
  organizationSlug: string;
  organizationId: string;
}

export default function PageClient({ organizationSlug, organizationId }: PageClientProps) {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [inputValue, setInputValue] = useState("");
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const markdownRef = useRef(markdown);
  const selectionRef = useRef(selection);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  markdownRef.current = markdown;
  selectionRef.current = selection;

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/organizations/${organizationId}/ai-debug/chat`,
      body: () => ({
        currentMarkdown: markdownRef.current,
        selection: selectionRef.current ?? undefined,
        context: [],
      }),
    }),
    onFinish: () => {
      clearSelection();
    },
    onError: (err) => {
      console.error("AI Error:", err);
    },
  });

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Handle textarea selection
  const handleTextareaSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const startOffset = textarea.selectionStart;
    const endOffset = textarea.selectionEnd;
    if (startOffset !== endOffset) {
      const text = textarea.value.substring(startOffset, endOffset).trim();
      if (text) {
        // Calculate line and character positions
        const getLineAndChar = (offset: number) => {
          const lines = textarea.value.substring(0, offset).split("\n");
          return {
            line: lines.length,
            char: (lines[lines.length - 1]?.length ?? 0) + 1,
          };
        };
        const start = getLineAndChar(startOffset);
        const end = getLineAndChar(endOffset);
        setSelection({
          text,
          startLine: start.line,
          startChar: start.char,
          endLine: end.line,
          endChar: end.char,
        });
      }
    }
  }, []);

  // Watch for editMarkdown results and update the markdown
  const processedToolCallsRef = useRef<Set<string>>(new Set());

  // Process tool results
  for (const message of messages) {
    if (message.role === "assistant" && message.parts) {
      for (const part of message.parts) {
        if (part.type === "tool-editMarkdown") {
          const toolPart = part as {
            toolCallId: string;
            state: string;
            output?: { updatedMarkdown?: string };
          };
          if (
            toolPart.state === "output-available" &&
            toolPart.output?.updatedMarkdown &&
            !processedToolCallsRef.current.has(toolPart.toolCallId)
          ) {
            processedToolCallsRef.current.add(toolPart.toolCallId);
            setMarkdown(toolPart.output.updatedMarkdown);
          }
        }
      }
    }
  }

  const handleSend = useCallback(
    async (instruction: string) => {
      await sendMessage({ text: instruction });
      setInputValue("");
    },
    [sendMessage]
  );

  const handlePresetClick = useCallback(
    (prompt: string) => {
      setInputValue(prompt);
    },
    []
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setMarkdown(DEFAULT_MARKDOWN);
    setInputValue("");
    setSelection(null);
    processedToolCallsRef.current.clear();
  }, [setMessages]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Debug</h1>
            <p className="text-muted-foreground text-sm">
              Test AI workflows and see full thinking and tool calls
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear All
          </Button>
        </div>

        {/* Preset Prompts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preset Prompts</CardTitle>
            <CardDescription>
              Click to trigger AI with a predefined prompt
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(PRESET_PROMPTS).map(([key, preset]) => (
              <Button
                key={key}
                variant="outline"
                onClick={() => handlePresetClick(preset.prompt)}
                disabled={isLoading}
                className="h-auto flex-col items-start gap-1 p-3"
              >
                <span className="font-medium">{preset.label}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {preset.description}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Current Document */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Current Document</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {markdown.split("\n").length} lines
                </Badge>
              </div>
              <CardDescription>
                Select text to focus AI edits on specific sections
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <textarea
                ref={textareaRef}
                value={markdown}
                readOnly
                onMouseUp={handleTextareaSelect}
                onSelect={handleTextareaSelect}
                className="h-[400px] w-full resize-none whitespace-pre-wrap rounded-lg border-0 bg-muted p-4 font-mono text-sm selection:bg-primary/30 focus:outline-none focus:ring-0"
                aria-label="Document content - select text to focus AI edits"
              />
            </CardContent>
          </Card>

          {/* AI Messages */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">AI Messages</CardTitle>
                <div className="flex items-center gap-2">
                  {isLoading && (
                    <Badge variant="secondary" className="text-xs animate-pulse">
                      Streaming...
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {messages.length} messages
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Full AI thinking, tool calls, and responses
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-[400px]">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Send a message or click a preset to start
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, messageIndex) => (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-lg border p-4",
                          message.role === "user"
                            ? "bg-primary/5 border-primary/20"
                            : "bg-card"
                        )}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <Badge
                            variant={message.role === "user" ? "default" : "secondary"}
                          >
                            {message.role}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            Message {messageIndex + 1}
                          </span>
                        </div>

                        {/* Message parts */}
                        <div className="space-y-3">
                          {message.parts?.map((part, partIndex) => (
                            <MessagePart
                              key={`${message.id}-${partIndex}`}
                              part={part as Record<string, unknown>}
                              index={partIndex}
                            />
                          ))}

                          {/* Empty state for messages without parts */}
                          {!message.parts?.length && (
                            <p className="text-muted-foreground text-sm italic">
                              No content parts
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Input */}
        <div className="mx-auto w-full max-w-2xl">
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            statusText={isLoading ? "AI is working..." : undefined}
            organizationSlug={organizationSlug}
            organizationId={organizationId}
            value={inputValue}
            onValueChange={setInputValue}
            selection={selection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>
    </div>
  );
}
