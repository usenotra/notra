"use client";

import { FileUpIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const TICK_MS = 280;

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
    }, TICK_MS);
  };

  return (
    <Button onClick={upload} progress={progress} variant="secondary">
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
