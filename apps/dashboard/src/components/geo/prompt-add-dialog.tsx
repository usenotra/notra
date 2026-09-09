"use client";

import {
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
} from "@notra/geo-core/constants/geo";
import {
  normalizeWebsiteUrl,
  stripWebsiteProtocol,
} from "@notra/geo-core/utils/geo-website";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import { PromptKeywordTextarea } from "@/components/geo/prompt-keyword-textarea";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { useGeoGenerateFromWebsite, useGscKeywords } from "@/lib/hooks/use-geo";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { cn } from "@/lib/utils";
import type { PromptAddDialogProps, PromptAddMode } from "@/types/geo";

function toPromptAddMode(value: string): PromptAddMode {
  return value === "website" ? "website" : "write";
}

const MODE_COPY_CLASS =
  "col-start-1 row-start-1 transition-opacity duration-normal ease-emphasized";

const MODE_PANEL_CLASS =
  "col-start-1 row-start-1 w-full transition-[opacity,translate] duration-normal ease-emphasized data-[starting-style]:translate-y-1.5 data-[ending-style]:-translate-y-1.5 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[hidden]:pointer-events-none data-[hidden]:invisible motion-reduce:translate-none [&[hidden]]:!block";

export function PromptAddDialog({
  open,
  onOpenChange,
  organizationId,
}: PromptAddDialogProps) {
  const formId = useId();
  const promptId = useId();
  const promptHintId = useId();
  const urlId = useId();
  const urlHintId = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<PromptAddMode>("write");
  const [draft, setDraft] = useState("");
  const [url, setUrl] = useState("");
  const { addPrompt } = useGeoPromptsDb(organizationId, { enabled: open });
  const generate = useGeoGenerateFromWebsite(organizationId);
  const { data: searchConsoleData } = useGscKeywords(organizationId, open);
  const searchConsoleKeywords = searchConsoleData?.keywords ?? [];

  const trimmed = draft.trim();
  const remainingToMin = GEO_PROMPT_MIN_LENGTH - trimmed.length;
  const canAdd =
    trimmed.length >= GEO_PROMPT_MIN_LENGTH &&
    trimmed.length <= GEO_PROMPT_MAX_LENGTH;
  const normalizedUrl = normalizeWebsiteUrl(url);
  const busy = generate.isPending;
  const canGenerate = normalizedUrl !== null && !busy;
  const writeMode = mode === "write";

  const close = () => {
    setMode("write");
    setDraft("");
    setUrl("");
    onOpenChange(false);
  };

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }
    addPrompt(trimmed);
    close();
  };

  const handleGenerate = () => {
    if (!normalizedUrl || !canGenerate) {
      return;
    }
    generate.mutate({ url: normalizedUrl }, { onSuccess: close });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "website") {
      handleGenerate();
      return;
    }
    handleAdd();
  };

  const handleModeChange = (value: string) => {
    const next = toPromptAddMode(value);
    setMode(next);
    requestAnimationFrame(() => {
      if (next === "website") {
        urlRef.current?.focus();
        return;
      }
      promptRef.current?.focus();
    });
  };

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        close();
      }}
      open={open}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add prompt</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="grid">
            <span
              aria-hidden={!writeMode}
              className={cn(
                MODE_COPY_CLASS,
                !writeMode && "invisible opacity-0"
              )}
            >
              A question your buyers ask AI engines.
            </span>
            <span
              aria-hidden={writeMode}
              className={cn(
                MODE_COPY_CLASS,
                writeMode && "invisible opacity-0"
              )}
            >
              Generate more buyer questions from a site you already have.
            </span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="space-y-4 px-4 md:px-0"
          id={formId}
          onSubmit={handleSubmit}
        >
          <Tabs onValueChange={handleModeChange} value={mode}>
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger disabled={busy} value="write">
                Write one
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="website">
                From a website
              </TabsTrigger>
            </TabsList>
            <div className="mt-4 grid">
              <TabsContent
                className={cn(
                  MODE_PANEL_CLASS,
                  writeMode ? "z-10" : "pointer-events-none"
                )}
                keepMounted
                value="write"
              >
                <div className="space-y-2">
                  <Label htmlFor={promptId}>Question</Label>
                  <PromptKeywordTextarea
                    aria-describedby={promptHintId}
                    autoFocus
                    id={promptId}
                    keywords={searchConsoleKeywords}
                    maxLength={GEO_PROMPT_MAX_LENGTH}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        handleAdd();
                      }
                    }}
                    placeholder="what tools should I use for automating changelogs"
                    ref={promptRef}
                    rows={4}
                    value={draft}
                  />
                  <div
                    className="text-muted-foreground flex items-center justify-between gap-3 text-xs"
                    id={promptHintId}
                  >
                    {searchConsoleKeywords.length > 0 ? (
                      <span>
                        Top Search Console queries highlight as you type.
                      </span>
                    ) : null}
                    <span className="ml-auto tabular-nums">
                      {remainingToMin > 0 && trimmed.length > 0
                        ? `${remainingToMin} more characters`
                        : `${trimmed.length}/${GEO_PROMPT_MAX_LENGTH}`}
                    </span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent
                className={cn(
                  MODE_PANEL_CLASS,
                  writeMode ? "pointer-events-none" : "z-10"
                )}
                keepMounted
                value="website"
              >
                <div className="space-y-2">
                  <Label htmlFor={urlId}>Website</Label>
                  <InputGroup>
                    <InputGroupAddon className="border-input border-r pr-2">
                      <InputGroupText>https://</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-describedby={urlHintId}
                      autoComplete="url"
                      disabled={generate.isPending}
                      id={urlId}
                      inputMode="url"
                      onChange={(event) =>
                        setUrl(stripWebsiteProtocol(event.target.value))
                      }
                      placeholder="yourcompany.com"
                      ref={urlRef}
                      value={url}
                    />
                  </InputGroup>
                  <p className="text-muted-foreground text-xs" id={urlHintId}>
                    We'll add buyer questions, plus aliases and competitors.
                    Existing prompts stay.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </form>
        <ResponsiveDialogFooter>
          <Button
            disabled={busy}
            onClick={close}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          {writeMode ? (
            <Button disabled={!canAdd} form={formId} type="submit">
              Add prompt
            </Button>
          ) : (
            <Button disabled={!canGenerate} form={formId} type="submit">
              {generate.isPending ? <StatusSpinner /> : null}
              Generate prompts
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
