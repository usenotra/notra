import { cn } from "@notra/ui/lib/utils";

import type { OfferingSentenceFieldProps } from "@/types/offering-check";

export function OfferingSentenceField({
  id,
  label,
  leading,
  invalid,
  className,
  ...props
}: OfferingSentenceFieldProps) {
  return (
    <span
      className={cn(
        "group/field relative inline-flex max-w-full items-baseline gap-2 rounded-xl px-1 align-baseline transition-[background-color] duration-200 focus-within:bg-[#8B5CF614] hover:bg-[#8B5CF60D] dark:focus-within:bg-[#A78BFA1F] dark:hover:bg-[#A78BFA14]",
        className
      )}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      {leading}
      <input
        aria-describedby={invalid ? "offering-check-error" : undefined}
        aria-invalid={invalid}
        className="[field-sizing:content] max-w-full min-w-[4ch] bg-transparent p-0 leading-[inherit] text-[#8B5CF6] caret-[#8B5CF6] outline-none placeholder:text-[#8B5CF659] dark:text-[#A78BFA] dark:placeholder:text-[#A78BFA59]"
        id={id}
        // Width fallback for browsers without field-sizing.
        size={Math.max(
          String(props.value ?? "").length,
          props.placeholder?.length ?? 0,
          4
        )}
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-1 bottom-0.5 h-0.5 rounded-full transition-colors duration-200",
          invalid
            ? "bg-[#DC2626]"
            : "bg-[#8B5CF63D] group-focus-within/field:bg-[#8B5CF6] dark:bg-[#A78BFA40] dark:group-focus-within/field:bg-[#A78BFA]"
        )}
      />
    </span>
  );
}
