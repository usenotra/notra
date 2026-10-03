"use client";

import { FileUpIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const TICK_MS = 280;

function UploadButton() {
  const [progress, setProgress] = useState<number>();
  const uploading = progress !== undefined;

  useEffect(() => {
    if (!uploading) {
      return;
    }
    const timer = setInterval(() => {
      const step = 6 + Math.random() * 14;
      setProgress((current) => {
        if (current === undefined) {
          return current;
        }
        const next = current + step;
        return next < 100 ? next : undefined;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [uploading]);

  return (
    <Button
      onClick={() => setProgress(0)}
      progress={progress}
      variant="secondary"
    >
      <FileUpIcon data-icon="inline-start" />
      Upload file
    </Button>
  );
}

export default function ButtonProgressExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6">
      <UploadButton />
    </div>
  );
}
