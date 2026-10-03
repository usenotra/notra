"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { useTranslations } from "use-intl";

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
  onImportCsv,
  organizationId,
}: PromptAddDialogProps) {
  const t = useTranslations("geo.promptAddDialog");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const tShared = useTranslations("geo.pages.shared");
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
          <ResponsiveDialogTitle>
            {tGeoShared("addPrompt")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="grid">
            <span
              aria-hidden={!writeMode}
              className={cn(
                MODE_COPY_CLASS,
                !writeMode && "invisible opacity-0"
              )}
            >
              {t("writeDescription")}
            </span>
            <span
              aria-hidden={writeMode}
              className={cn(
                MODE_COPY_CLASS,
                writeMode && "invisible opacity-0"
              )}
            >
              {t("websiteDescription")}
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
                {t("writeTab")}
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="website">
                {t("websiteTab")}
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
                  <Label htmlFor={promptId}>
                    {tCommon2("labels.question")}
                  </Label>
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
                    placeholder={t("questionPlaceholder")}
                    ref={promptRef}
                    rows={4}
                    value={draft}
                  />
                  <div
                    className="text-muted-foreground flex items-center justify-between gap-3 text-xs"
                    id={promptHintId}
                  >
                    {searchConsoleKeywords.length > 0 ? (
                      <span>{t("searchConsoleHint")}</span>
                    ) : null}
                    <span className="ml-auto tabular-nums">
                      {remainingToMin > 0 && trimmed.length > 0
                        ? t("moreCharacters", { count: remainingToMin })
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
                  <Label htmlFor={urlId}>{tCommon2("labels.website")}</Label>
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
                    {t("websiteHint")}
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </form>
        <ResponsiveDialogFooter>
          {onImportCsv ? (
            <Button
              className="sm:mr-auto"
              disabled={busy}
              onClick={() => {
                close();
                onImportCsv();
              }}
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={Upload01Icon} size={14} />
              {tShared("importCsv")}
            </Button>
          ) : null}
          <Button
            disabled={busy}
            onClick={close}
            type="button"
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          {writeMode ? (
            <Button disabled={!canAdd} form={formId} type="submit">
              {tGeoShared("addPrompt")}
            </Button>
          ) : (
            <Button disabled={!canGenerate} form={formId} type="submit">
              {generate.isPending ? <StatusSpinner /> : null}
              {tGeoShared("generatePrompts")}
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
