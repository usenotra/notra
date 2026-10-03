import { cn } from "cn";
import { Globe } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { PerplexityFaviconProps } from "../types/perplexity";

export const perplexityFaviconSrc = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

export const PerplexityFavicon = ({
  className,
  domain,
  ...props
}: PerplexityFaviconProps) => (
  <Avatar
    className={cn("size-4 after:hidden", className)}
    data-slot="perplexity-favicon"
    {...props}
  >
    <AvatarImage alt="" src={perplexityFaviconSrc(domain)} />
    <AvatarFallback className="text-pplx-subtle bg-transparent">
      <Globe className="size-full" strokeWidth={1.75} />
    </AvatarFallback>
  </Avatar>
);
