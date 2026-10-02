const linkClass =
  "font-medium text-primary underline underline-offset-2 hover:text-primary-hover";

export function ContactDeveloperNote() {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border border-[#ECECEC] px-7 py-5 dark:border-white/10">
      <p className="font-display text-[0.9375rem]/5 font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
        Building with the API or an agent?
      </p>
      <p className="font-sans text-[0.8125rem]/4.75 text-[#1E1E1EA6] dark:text-white/60">
        Start with the{" "}
        <a className={linkClass} href="/auth.md">
          agent authentication guide
        </a>
        , the{" "}
        <a className={linkClass} href="/.well-known/api-catalog">
          API catalog
        </a>
        , and the scoped{" "}
        <a className={linkClass} href="/developers/llms.txt">
          developer llms.txt
        </a>
        .
      </p>
    </div>
  );
}
