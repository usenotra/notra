"use client";

import { FileImportIcon, FileUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { useRef, useState } from "react";

const LOADING_DURATION_MS = 2000;
const UPLOAD_TICK_MS = 280;

function LoadingButton(
  props: Omit<React.ComponentProps<typeof Button>, "loading" | "onClick">
) {
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), LOADING_DURATION_MS);
  };

  return <Button {...props} loading={loading} onClick={run} />;
}

function UploadButton() {
  const [progress, setProgress] = useState<number>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const upload = () => {
    setProgress(0);
    timer.current = setInterval(() => {
      setProgress((current = 0) => {
        const next = current + 6 + Math.random() * 14;
        if (next < 100) {
          return next;
        }
        clearInterval(timer.current);
        return undefined;
      });
    }, UPLOAD_TICK_MS);
  };

  return (
    <Button onClick={upload} progress={progress} variant="secondary">
      <HugeiconsIcon data-icon="inline-start" icon={FileUploadIcon} />
      Upload file
    </Button>
  );
}

export function DesignSystemButtonStatesDemo() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <LoadingButton>Save changes</LoadingButton>
        <LoadingButton variant="secondary">Continue</LoadingButton>
        <LoadingButton size="sm" variant="outline">
          Generate
        </LoadingButton>
        <LoadingButton variant="destructive">Delete</LoadingButton>
        <LoadingButton aria-label="Refresh" size="icon">
          ◎
        </LoadingButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <UploadButton />
        <LoadingButton variant="outline">
          <HugeiconsIcon data-icon="inline-start" icon={FileImportIcon} />
          Import
        </LoadingButton>
      </div>
      <p className="text-muted-foreground text-xs">
        Click to preview. <code>loading</code> swaps the label for dots for work
        you can't measure, like an import. <code>progress</code> (0–100) fills
        the button for uploads.
      </p>
    </div>
  );
}
