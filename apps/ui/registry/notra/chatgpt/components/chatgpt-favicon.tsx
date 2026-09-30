import { cn } from "cn";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { CHATGPT_FAVICON_URL } from "../constants/chatgpt";
import type { ChatgptFaviconProps } from "../types/chatgpt";

const faviconSrc = (domain: string) =>
  `${CHATGPT_FAVICON_URL}?domain=${encodeURIComponent(domain)}&sz=64`;

export const ChatgptFavicon = ({
  className,
  domain,
  src,
  ...props
}: ChatgptFaviconProps) => (
  <Avatar
    className={cn("bg-chatgpt-hover size-4 after:hidden", className)}
    data-slot="chatgpt-favicon"
    {...props}
  >
    <AvatarImage alt="" src={src ?? faviconSrc(domain)} />
    <AvatarFallback className="bg-chatgpt-hover" />
  </Avatar>
);
