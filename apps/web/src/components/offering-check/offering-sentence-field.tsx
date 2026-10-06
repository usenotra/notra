import { cn } from "@notra/ui/lib/utils";

import type { OfferingSentenceFieldProps } from "@/types/offering-check";

const SIZER_CLASS =
  "invisible col-start-1 row-start-1 overflow-hidden pe-0.5 whitespace-pre";

export function OfferingSentenceField({
  id,
  label,
  leading,
  invalid,
  active = false,
  className,
  ...props
}: OfferingSentenceFieldProps) {
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
        Hidden copies of the placeholder and the value share one grid cell
        with the input, so the field is as wide as the longer of the two and
        the sentence does not jump when the first letter replaces the
        placeholder.
      */}
      <span className="inline-grid max-w-full min-w-0">
        <span aria-hidden className={SIZER_CLASS}>
          {props.placeholder}
        </span>
        <span aria-hidden className={SIZER_CLASS}>
          {props.value}
        </span>
        <input
          aria-describedby={invalid ? "offering-check-error" : undefined}
          aria-invalid={invalid}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 leading-[inherit] text-[#8B5CF6] caret-[#8B5CF6] outline-none placeholder:text-[#8B5CF659] dark:text-[#A78BFA] dark:placeholder:text-[#A78BFA59]"
          id={id}
          size={1}
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
