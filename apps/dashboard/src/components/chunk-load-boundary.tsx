import { Component } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type {
  ChunkLoadBoundaryProps,
  ChunkLoadBoundaryState,
} from "@/types/framework";
import {
  isChunkLoadError,
  reloadForClientUpdate,
} from "@/utils/chunk-load-error";

function ChunkLoadFallback() {
  const t = useTranslations("errors.route");

  return (
    <div className="border-border bg-muted/40 space-y-3 rounded-lg border p-4">
      <div role="alert">
        <p className="text-foreground text-sm font-medium">{t("chunkTitle")}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("chunkDescription")}
        </p>
      </div>
      <Button onClick={reloadForClientUpdate} size="sm" variant="outline">
        {t("reload")}
      </Button>
    </div>
  );
}

export class ChunkLoadBoundary extends Component<
  ChunkLoadBoundaryProps,
  ChunkLoadBoundaryState
> {
  constructor(props: ChunkLoadBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ChunkLoadBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error !== null) {
      if (isChunkLoadError(this.state.error)) {
        return <ChunkLoadFallback />;
      }
      throw this.state.error;
    }
    return this.props.children;
  }
}
