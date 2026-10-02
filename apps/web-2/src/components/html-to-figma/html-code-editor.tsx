import { cn } from "@notra/ui/lib/utils";
import { useRef } from "react";

import { HTML_HIGHLIGHT_CSS } from "@/lib/html-to-figma/constants";
import { highlightHtml } from "@/lib/html-to-figma/highlight";
import type { HtmlCodeEditorProps } from "@/types/html-to-figma";

const SHARED_CLASS =
  "absolute inset-0 m-0 h-full w-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6";

export default function HtmlCodeEditor({
  value,
  onChange,
  placeholder,
}: HtmlCodeEditorProps) {
  const preRef = useRef<HTMLPreElement>(null);

  function syncScroll(target: HTMLTextAreaElement) {
    const pre = preRef.current;
    if (!pre) {
      return;
    }

    pre.scrollTop = target.scrollTop;
    pre.scrollLeft = target.scrollLeft;
  }

  function handlePaste(target: HTMLTextAreaElement) {
    const { scrollX, scrollY } = window;

    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      target.scrollTop = 0;
      target.scrollLeft = 0;
      syncScroll(target);
    });
  }

  return (
    <div className="bg-background focus-within:border-foreground/30 relative h-[60svh] max-h-[44rem] min-h-[24rem] w-full overflow-hidden rounded-2xl border border-[#1E1E1E14] transition-colors dark:border-white/10">
      <style>{HTML_HIGHLIGHT_CSS}</style>
      <pre
        aria-hidden="true"
        className={cn(SHARED_CLASS, "text-foreground pointer-events-none")}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: tokens are escaped in highlightHtml
        dangerouslySetInnerHTML={{ __html: `${highlightHtml(value)}\n` }}
        ref={preRef}
      />
      <textarea
        aria-label="HTML to convert"
        className={cn(
          SHARED_CLASS,
          "caret-foreground placeholder:text-muted-foreground/70 resize-none bg-transparent text-transparent outline-none"
        )}
        onChange={(event) => {
          onChange(event.target.value);
          syncScroll(event.currentTarget);
        }}
        onPaste={(event) => handlePaste(event.currentTarget)}
        onScroll={(event) => syncScroll(event.currentTarget)}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
