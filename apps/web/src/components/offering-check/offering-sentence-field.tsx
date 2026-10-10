import { cn } from "@notra/ui/lib/utils";
import { useEffect, useLayoutEffect, useRef } from "react";

import type { OfferingSentenceFieldProps } from "@/types/offering-check";

export function OfferingSentenceField({
  id,
  label,
  leading,
  invalid,
  active = false,
  holdWidth,
  className,
  ...props
}: OfferingSentenceFieldProps) {
  const sizer = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastValue = useRef<string | null>(null);
  const value = String(props.value ?? "");
  const placeholder = props.placeholder ?? "";
  // Never narrower than the placeholder while the sentence is being edited,
  // so nothing moves under the cursor. Afterwards it hugs the text.
  const holdPlaceholderWidth = value.length === 0 || holdWidth || active;

  // Sized before paint on every change. Typing resizes instantly, because an
  // animated width would lag behind the text and scroll it inside the input.
  // Only the sentence opening and closing up (focus in or out) animates.
  useLayoutEffect(() => {
    const field = input.current;
    const measured = sizer.current?.getBoundingClientRect().width;
    if (!(field && measured)) {
      return;
    }
    const typed = lastValue.current !== null && lastValue.current !== value;
    lastValue.current = value;
    field.style.transitionDuration = typed ? "0s" : "";
    field.style.width = `${measured}px`;
  }, [value, placeholder, holdPlaceholderWidth]);

  // Late font loads change text widths without any prop changing.
  useEffect(() => {
    const element = sizer.current;
    const field = input.current;
    if (!(element && field)) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const width = `${element.getBoundingClientRect().width}px`;
      if (field.style.width !== width) {
        field.style.transitionDuration = "0s";
        field.style.width = width;
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      data-active={active || undefined}
      className={cn(
        "group/field relative inline-flex max-w-full items-baseline rounded-xl px-1.5 align-baseline transition-[background-color] duration-200 focus-within:bg-[#8B5CF614] hover:bg-[#8B5CF60D] data-active:bg-[#8B5CF614] dark:focus-within:bg-[#A78BFA1F] dark:hover:bg-[#A78BFA14] dark:data-active:bg-[#A78BFA1F]",
        className
      )}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      {leading}
      {/*
        The invisible sizer holds the text the input should fit; the input
        takes its measured width.
      */}
      <span className="relative inline-flex max-w-full min-w-0">
        <span
          aria-hidden
          className="invisible absolute start-0 top-0 inline-grid pe-0.5 whitespace-pre"
          ref={sizer}
        >
          {holdPlaceholderWidth ? (
            <span className="col-start-1 row-start-1">{placeholder}</span>
          ) : null}
          <span className="col-start-1 row-start-1">{value}</span>
        </span>
        <input
          aria-describedby={invalid ? "offering-check-error" : undefined}
          aria-invalid={invalid}
          className="max-w-full min-w-[1ch] bg-transparent p-0 leading-[inherit] text-[#8B5CF6] caret-[#8B5CF6] transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none placeholder:text-[#8B5CF699] motion-reduce:transition-none dark:text-[#A78BFA] dark:placeholder:text-[#A78BFA8C]"
          id={id}
          ref={input}
          size={Math.max(value.length, placeholder.length, 1)}
          {...props}
        />
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-1.5 bottom-0.5 h-0.5 rounded-full transition-colors duration-200",
          invalid
            ? "bg-[#DC2626]"
            : "bg-[#8B5CF63D] group-focus-within/field:bg-[#8B5CF6] group-data-active/field:bg-[#8B5CF6] dark:bg-[#A78BFA40] dark:group-focus-within/field:bg-[#A78BFA] dark:group-data-active/field:bg-[#A78BFA]"
        )}
      />
    </span>
  );
}
