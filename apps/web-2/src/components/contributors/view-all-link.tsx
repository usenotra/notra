import { Link } from "@tanstack/react-router";
import type { ViewAllLinkProps } from "~types/contributors";

export function ViewAllLink({ href, children }: ViewAllLinkProps) {
  return (
    <Link
      className="text-primary shrink-0 font-sans text-sm font-medium hover:underline"
      to={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </Link>
  );
}
