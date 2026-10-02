"use client";

import { Copy01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";

import {
  DEMO_CONSOLE_METHODS,
  DEMO_CONSOLE_PRESETS,
  DEMO_CONSOLE_SECTION_BY_SEGMENT,
} from "@/constants/demo-console";
import { usePathname } from "@/lib/navigation";
import type {
  DemoConsolePreset,
  DemoConsoleResponse,
  DemoSandboxInfo,
} from "@/types/demo";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import {
  buildDemoCurl,
  formatDemoConsoleBody,
  resolveDemoConsolePath,
  sendDemoConsoleRequest,
} from "@/utils/demo-console";

interface DemoApiConsoleProps {
  sandbox: DemoSandboxInfo | null;
}

function orderedPresets(pathname: string): readonly DemoConsolePreset[] {
  const segments = pathname.split("/").filter(Boolean);
  const section = segments
    .map((segment) => DEMO_CONSOLE_SECTION_BY_SEGMENT[segment])
    .findLast(Boolean);
  if (!section) {
    return DEMO_CONSOLE_PRESETS;
  }
  return [
    ...DEMO_CONSOLE_PRESETS.filter((preset) => preset.section === section),
    ...DEMO_CONSOLE_PRESETS.filter((preset) => preset.section !== section),
  ];
}

/**
 * Outside the component on purpose: React Compiler can't lower try/finally,
 * and the flag must reset even if the request throws.
 */
async function sendWithLoadingFlag(
  request: Parameters<typeof sendDemoConsoleRequest>[0],
  setSending: (sending: boolean) => void
): Promise<DemoConsoleResponse> {
  setSending(true);
  try {
    return await sendDemoConsoleRequest(request);
  } finally {
    setSending(false);
  }
}

export function DemoApiConsole({ sandbox }: DemoApiConsoleProps) {
  const t = useTranslations("demo.console");
  const pathname = usePathname();
  const presets = useMemo(() => orderedPresets(pathname), [pathname]);
  const [presetId, setPresetId] = useState<string>(presets[0]?.id ?? "");
  const [method, setMethod] = useState<DemoConsolePreset["method"]>(
    presets[0]?.method ?? "GET"
  );
  const [path, setPath] = useState(presets[0]?.path ?? "/v1/posts");
  const [body, setBody] = useState(() =>
    formatDemoConsoleBody(presets[0]?.body)
  );
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<DemoConsoleResponse | null>(null);

  const resolvedPath = resolveDemoConsolePath(path, sandbox?.projectId ?? null);
  const hasBody = method !== "GET" && method !== "DELETE";

  const applyPreset = (id: string) => {
    const preset = DEMO_CONSOLE_PRESETS.find((item) => item.id === id);
    if (!preset) {
      return;
    }
    setPresetId(id);
    setMethod(preset.method);
    setPath(preset.path);
    setBody(formatDemoConsoleBody(preset.body));
    setResponse(null);
  };

  const send = async () => {
    if (!sandbox?.apiKey) {
      return;
    }
    setResponse(
      await sendWithLoadingFlag(
        {
          baseUrl: sandbox.apiBaseUrl,
          apiKey: sandbox.apiKey,
          method,
          path: resolvedPath,
          body: hasBody ? body : null,
        },
        setSending
      )
    );
  };

  if (!sandbox) {
    return null;
  }

  if (!sandbox.apiKey) {
    return <p className="text-muted-foreground text-sm">{t("noKey")}</p>;
  }

  const curl = buildDemoCurl({
    baseUrl: sandbox.apiBaseUrl,
    apiKey: sandbox.apiKey,
    method,
    path: resolvedPath,
    body: hasBody ? body : null,
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{t("keyLabel")}</span>
          <Button
            onClick={() =>
              copyTextToClipboard(sandbox.apiKey ?? "", t("keyCopied"))
            }
            size="xs"
            variant="ghost"
          >
            <HugeiconsIcon icon={Copy01Icon} />
            {t("copy")}
          </Button>
        </div>
        <code className="truncate font-mono text-xs">
          {`${sandbox.apiKey.slice(0, 16)}…`}
        </code>
        <p className="text-muted-foreground text-xs">
          {t("keyHint", { url: sandbox.apiBaseUrl })}
        </p>
      </section>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("preset")}</span>
        <select
          className="bg-background h-8 rounded-lg border px-2 text-sm"
          onChange={(event) => applyPreset(event.target.value)}
          value={presetId}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {t(`presets.${preset.id}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <select
          aria-label={t("method")}
          className="bg-background h-8 rounded-lg border px-2 font-mono text-xs"
          onChange={(event) => {
            const next = DEMO_CONSOLE_METHODS.find(
              (candidate) => candidate === event.target.value
            );
            if (next) {
              setMethod(next);
            }
          }}
          value={method}
        >
          {DEMO_CONSOLE_METHODS.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
        <Input
          aria-label={t("path")}
          onChange={(event) => setPath(event.target.value)}
          spellCheck={false}
          value={path}
        />
      </div>

      {hasBody ? (
        <Textarea
          aria-label={t("body")}
          className="min-h-32"
          onChange={(event) => setBody(event.target.value)}
          spellCheck={false}
          value={body}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <Button disabled={sending} onClick={send}>
          <HugeiconsIcon icon={SentIcon} />
          {sending ? t("sending") : t("send")}
        </Button>
        <Button
          onClick={() => copyTextToClipboard(curl, t("curlCopied"))}
          variant="outline"
        >
          <HugeiconsIcon icon={Copy01Icon} />
          {t("copyCurl")}
        </Button>
      </div>

      {response ? (
        <section aria-live="polite" className="flex flex-col gap-2">
          <p className="font-mono text-xs">
            <span
              className={
                response.status < 400 ? "text-geo-up" : "text-destructive"
              }
            >
              {response.status}
            </span>
            <span className="text-muted-foreground">
              {` · ${Math.round(response.durationMs)} ms`}
            </span>
          </p>
          <pre className="bg-muted/40 max-h-80 overflow-auto rounded-lg border p-3 font-mono text-xs">
            {response.body}
          </pre>
          <p className="text-muted-foreground text-xs">{t("seeFeed")}</p>
        </section>
      ) : null}
    </div>
  );
}
