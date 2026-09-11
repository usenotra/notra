"use client";

import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download01Icon,
  PrinterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@notra/ui/lib/utils";
import type { BackupCodesPanelProps } from "../../../lib/security-types";
import { Button } from "../../ui/button";

const COPIED_RESET_MS = 2000;
const FILE_NAME = "backup-codes.txt";

function buildExportText(
  codes: string[],
  issuer: string,
  accountLabel?: string
) {
  const header = [
    `${issuer} backup codes`,
    accountLabel ? `Account: ${accountLabel}` : null,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Each code can be used once if you lose access to your authenticator app.",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return `${header}${codes.join("\n")}\n`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function BackupCodesPanel({
  codes,
  issuer = "Notra",
  accountLabel,
  doneLabel = "Done",
  onDone,
  className,
}: BackupCodesPanelProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const exportText = () => buildExportText(codes, issuer, accountLabel);

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setError(null);
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, COPIED_RESET_MS);
    } catch {
      setError("Couldn't copy. Select the codes and copy them manually.");
    }
  }

  function downloadCodes() {
    const blob = new Blob([exportText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${issuer.toLowerCase()}-${FILE_NAME}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printCodes() {
    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) {
      setError("Your browser blocked the print window.");
      return;
    }
    const rows = codes
      .map((code) => `<li>${escapeHtml(code)}</li>`)
      .join("");
    printWindow.document.write(
      `<!doctype html><title>${escapeHtml(issuer)} backup codes</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;color:#111}h1{font-size:18px;margin:0 0 4px}p{color:#555;font-size:13px;margin:0 0 20px}ul{list-style:none;padding:0;margin:0;columns:2;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;line-height:2}</style><h1>${escapeHtml(issuer)} backup codes</h1><p>${accountLabel ? `${escapeHtml(accountLabel)} · ` : ""}Each code works once.</p><ul>${rows}</ul>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div>
        <p className="font-medium text-sm">Save your backup codes</p>
        <p className="text-muted-foreground text-sm">
          Each works once if you lose your device. They won&apos;t be shown
          again.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-muted/50 px-5 py-4 font-mono text-sm tabular-nums select-all sm:grid-cols-2">
        {codes.map((code) => (
          <li className="text-center tracking-wider" key={code}>
            {code}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={downloadCodes} type="button" variant="outline">
          <HugeiconsIcon icon={Download01Icon} />
          Download
        </Button>
        <Button onClick={printCodes} type="button" variant="outline">
          <HugeiconsIcon icon={PrinterIcon} />
          Print
        </Button>
        <Button onClick={copyCodes} type="button" variant="outline">
          <HugeiconsIcon
            className={copied ? "text-success" : undefined}
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
          />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {onDone && (
        <div className="flex justify-end">
          <Button onClick={onDone} type="button">
            {doneLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
