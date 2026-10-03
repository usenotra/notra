import { cn } from "cn";

import { AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import type { ChatgptSearchProps } from "../types/chatgpt";
import { ChatgptFavicon } from "./chatgpt-favicon";
import { ChatgptSearchIcon } from "./chatgpt-icons";

const STACK_LIMIT = 3;

export const ChatgptSearch = ({
  className,
  sites,
  websites,
  ...props
}: ChatgptSearchProps) => {
  const noun = websites === 1 ? "website" : "websites";

  return (
    <Button
      className={cn(
        "font-chatgpt text-chatgpt-muted hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 aria-expanded:text-chatgpt-fg h-auto gap-1.5 rounded-sm border-0 p-0 text-sm leading-5 font-normal transition-colors hover:bg-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent",
        className
      )}
      data-slot="chatgpt-search"
      variant="ghost"
      {...props}
    >
      {sites && sites.length > 0 ? (
        <AvatarGroup
          aria-hidden="true"
          className="*:data-[slot=avatar]:ring-chatgpt-bg -space-x-1.5 *:data-[slot=avatar]:ring-2"
        >
          {sites.slice(0, STACK_LIMIT).map((site) => (
            <ChatgptFavicon
              className="size-5"
              domain={site.domain}
              key={site.domain}
              src={site.favicon}
            />
          ))}
        </AvatarGroup>
      ) : (
        <ChatgptSearchIcon className="text-chatgpt-search size-4" />
      )}
      <span>{`Searched ${websites} ${noun}`}</span>
    </Button>
  );
};
