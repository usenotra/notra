"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { useState } from "react";
import { useTranslations } from "use-intl";

export function ContentImageView({ alt, src }: { alt: string; src: string }) {
  const t = useTranslations("content.editor.media");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const label = alt || tCommon("labels.image");

  return (
    <>
      <button
        aria-label={t("expand", { label })}
        className="focus-visible:ring-ring/50 block w-full cursor-zoom-in rounded-xl text-left outline-none focus-visible:ring-2"
        onClick={() => setOpen(true)}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        <img
          alt={alt}
          className="ring-foreground/10 max-h-128 w-full rounded-xl object-contain ring-1"
          draggable={false}
          src={src}
        />
      </button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-6xl">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <div className="pt-6">
            <img
              alt={alt}
              className="max-h-dvh w-full rounded-lg object-contain"
              src={src}
            />
            {alt ? (
              <p className="text-muted-foreground px-1 pt-2 text-xs">{alt}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
