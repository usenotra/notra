import {
  COMPARE_CUSTOMER_LOGOS,
  COMPARE_CUSTOMERS_CAPTION,
} from "@/constants/compare/page";

export function CompareCustomerLogos() {
  return (
    <section className="flex w-[min(100%-3rem,64rem)] flex-col items-center gap-6">
      <p className="font-display text-center text-base font-medium tracking-[-0.01em] text-[#1E1E1E80] dark:text-white/50">
        {COMPARE_CUSTOMERS_CAPTION}
      </p>
      <ul className="grid w-full grid-cols-2 overflow-hidden rounded-2xl border border-[#1E1E1E14] sm:grid-cols-4 dark:border-white/10">
        {COMPARE_CUSTOMER_LOGOS.map(({ name, label, Logo, href }) => (
          <li
            className="-mt-px -ml-px flex h-24 items-center justify-center border-t border-l border-[#1E1E1E14] px-6 text-[#6B7280] dark:border-white/10 dark:text-[#9CA3AF]"
            key={name}
          >
            {href ? (
              <a
                aria-label={label}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                href={href}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                <Logo className="h-8 w-auto max-w-full" />
              </a>
            ) : (
              <Logo aria-label={label} className="h-8 w-auto max-w-full" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
