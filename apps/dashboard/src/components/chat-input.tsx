"use client";

import { Button } from "@notra/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@notra/ui/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ALL_INTEGRATIONS } from "@/lib/integrations/catalog";

type ChatInputProps = {
  onSend?: (value: string) => void;
  isLoading?: boolean;
  statusText?: string;
};

const ChatInput = ({ onSend, isLoading = false, statusText }: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0";
    const maxHeightRem = 12.5;
    const maxHeightPx = maxHeightRem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    element.style.height = `${Math.min(element.scrollHeight / parseFloat(getComputedStyle(document.documentElement).fontSize), maxHeightRem)}rem`;
    element.style.overflowY = element.scrollHeight > maxHeightPx ? "auto" : "hidden";
  }, []);
  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend?.(trimmed);
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }, [onSend, resizeTextarea, value, isLoading]);

  useHotkeys(
    "enter",
    (event) => {
      if (event.shiftKey) return;
      event.preventDefault();
      handleSend();
    },
    {
      enableOnFormTags: ["TEXTAREA"],
    },
    [handleSend],
  );

  return (
    <Card
      className="bg-background ease-out-expo w-full gap-0 rounded-[14px] border-0 py-0 shadow-none transition-shadow duration-200"
      data-focused={isFocused ? "true" : "false"}
    >
      <CardHeader className="sr-only">
        <span>Chat input</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-[14px] border border-border bg-background p-0.5 shadow-lg" tabIndex={-1}>
          {isLoading && statusText && (
            <div className="flex items-start gap-2 px-3.5 pt-2 pb-1">
              <svg
                className="size-4 shrink-0 mt-0.5 animate-spin text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-muted-foreground leading-5">{statusText}</p>
            </div>
          )}
          <div className="bg-background flex flex-col rounded-xl">
            <div className="flex w-full items-center">
              <div className="relative flex flex-1 cursor-text transition-colors [--lh:1lh]">
                <Textarea
                  className="min-h-8 max-h-[12.5rem] w-full resize-none border-0 bg-transparent py-0 pl-3.5 pr-2 text-sm text-foreground leading-8 whitespace-pre-wrap outline-none shadow-none ring-0 caret-foreground focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send a message"
                  disabled={isLoading}
                  placeholder={isLoading ? "AI is working..." : "Send a message..."}
                  onBlur={() => setIsFocused(false)}
                  onChange={(event) => {
                    setValue(event.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onInput={resizeTextarea}
                  ref={textareaRef}
                  rows={1}
                  value={value}
                />
              </div>
            </div>
          </div>
          <CardFooter className="flex items-center justify-between overflow-hidden p-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      className="bg-muted hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-1.5 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-at-sign size-4"
                          aria-hidden="true"
                        >
                          <title>At sign</title>
                          <circle cx="12" cy="12" r="4" />
                          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                        </svg>
                        <span className="hidden min-[400px]:inline">
                          Add Context
                        </span>
                        <div className="flex items-center pr-1 sm:pr-2">
                          <span className="-mr-1.5 rounded-md bg-background p-0.5 ring-2 ring-white dark:ring-black [&_svg]:size-4">
                            <Slack />
                          </span>
                          <span className="-mr-1.5 rounded-md bg-background p-0.5 ring-2 ring-white dark:ring-black [&_svg]:size-4">
                            <Github />
                          </span>
                          <span className="rounded-md bg-background p-0.5 ring-2 ring-white dark:ring-black [&_svg]:size-4">
                            <Linear />
                          </span>
                        </div>
                      </div>
                    </Button>
                  }
                />
                <PopoverContent
                  align="start"
                  className="bg-background border-border w-48 rounded-lg border p-1 shadow-lg"
                >
                  {ALL_INTEGRATIONS.map((integration, index) => {
                    const disabled = !integration.available;
                    const isFirst = index === 0;
                    return (
                      <button
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          disabled
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-accent"
                        } ${isFirst ? "bg-muted rounded-md" : ""}`}
                        disabled={disabled}
                        key={integration.id}
                        type="button"
                      >
                        <span className="size-4 shrink-0 text-foreground [&_svg]:size-4">
                          {integration.icon}
                        </span>
                        <span className="text-foreground">{integration.name}</span>
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    tabIndex={0}
                    type="button"
                    className="group/button focus-visible:ring-ring h-7 shrink-0 rounded-lg bg-muted px-1.5 transition-colors hover:bg-accent focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                    size="sm"
                    variant="outline"
                    onClick={handleSend}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      {isLoading ? (
                        <svg
                          className="size-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <title>Loading</title>
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <>
                          <div className="text-sm px-0.5 leading-0 transition-transform">
                            Go
                          </div>
                          <div className="hidden h-4 items-center rounded border border-border bg-background px-1 text-[10px] text-muted-foreground shadow-xs sm:inline-flex md:inline-flex">
                            ↵
                          </div>
                        </>
                      )}
                    </div>
                  </Button>
                }
              />
              <TooltipContent>
                {isLoading ? "AI is thinking..." : "Enter to send. Shift+Enter for a new line."}
              </TooltipContent>
            </Tooltip>
          </CardFooter>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInput;
