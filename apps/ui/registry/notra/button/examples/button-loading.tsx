"use client";

import { ArrowRightIcon, SendIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const LOADING_DURATION_MS = 2000;

function LoadingButton(
  props: Omit<React.ComponentProps<typeof Button>, "loading" | "onClick">
) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), LOADING_DURATION_MS);
  };

  return <Button {...props} loading={loading} onClick={handleClick} />;
}

export default function ButtonLoadingExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6">
      <LoadingButton>Save changes</LoadingButton>
      <LoadingButton variant="secondary">
        Continue
        <ArrowRightIcon data-icon="inline-end" />
      </LoadingButton>
      <LoadingButton variant="outline" size="sm">
        Generate
      </LoadingButton>
      <LoadingButton variant="destructive">Delete</LoadingButton>
      <LoadingButton aria-label="Send" size="icon">
        <SendIcon />
      </LoadingButton>
    </div>
  );
}
