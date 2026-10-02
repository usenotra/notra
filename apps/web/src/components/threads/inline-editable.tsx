import { cn } from "@notra/ui/lib/utils";
import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface InlineEditableProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  prefix?: string;
  className?: string;
  ariaLabel: string;
  maxLength: number;
}

export function InlineEditable({
  value,
  onChange,
  placeholder,
  prefix,
  className,
  ariaLabel,
  maxLength,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [inputWidth, setInputWidth] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const display = value.trim() ? value : placeholder;
  const isPlaceholder = !value.trim();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useLayoutEffect(() => {
    if (!editing) {
      return;
    }
    const el = measureRef.current;
    if (!el) {
      return;
    }
    setInputWidth(Math.ceil(el.getBoundingClientRect().width));
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setInputWidth(Math.ceil(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [editing]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    }
  }

  function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
    const displayWidth = event.currentTarget
      .querySelector("[data-inline-editable-display]")
      ?.getBoundingClientRect().width;
    if (displayWidth) {
      setInputWidth(Math.ceil(displayWidth));
    }
    setEditing(true);
  }

  if (editing) {
    return (
      <span
        className={cn(
          "focus-within:border-muted-foreground/70 hover:border-muted-foreground/70 group-hover/post:border-muted-foreground/45 relative inline-flex items-center border-b border-dashed border-transparent transition-colors",
          className,
          isPlaceholder && "font-normal"
        )}
      >
        {prefix && (
          <span className={cn("pointer-events-none", className)}>{prefix}</span>
        )}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none invisible absolute whitespace-pre",
            className,
            isPlaceholder && "font-normal"
          )}
          ref={measureRef}
        >
          {display}
        </span>
        <input
          aria-label={ariaLabel}
          className={cn("min-w-4 bg-transparent outline-none", className)}
          maxLength={maxLength}
          onBlur={() => setEditing(false)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          style={inputWidth ? { width: inputWidth } : undefined}
          value={value}
        />
      </span>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "group/edit hover:border-muted-foreground/70 hover:decoration-foreground/40 focus-visible:border-muted-foreground/70 focus-visible:bg-muted/70 group-hover/post:border-muted-foreground/45 inline-flex max-w-full cursor-text items-center gap-1 truncate border-b border-dashed border-transparent text-left transition-colors hover:underline hover:decoration-dashed hover:underline-offset-4 focus-visible:outline-none",
        className,
        isPlaceholder && "text-muted-foreground/60 font-normal"
      )}
      onClick={handleEditClick}
      type="button"
    >
      <span className="truncate" data-inline-editable-display>
        {prefix}
        {display}
      </span>
    </button>
  );
}
