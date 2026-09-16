import Link from "next/link";
import type { ViewAllLinkProps } from "~types/contributors";

export function ViewAllLink({ href, children }: ViewAllLinkProps) {
  return (
    <Link
      className="text-primary shrink-0 font-sans text-sm font-medium hover:underline"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </Link>
  );
}
