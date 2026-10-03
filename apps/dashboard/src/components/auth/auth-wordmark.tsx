import { Notra } from "@notra/ui/components/ui/svgs/notra";
import Link from "next/link";

import type { AuthWordmarkProps } from "@/types/auth/wordmark";

export function AuthWordmark({ href }: AuthWordmarkProps) {
  const mark = (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg dark:bg-[#F6F3F1]"
      >
        <Notra className="size-7" />
      </span>
      <span className="text-foreground text-lg font-semibold tracking-tight">
        Notra
      </span>
    </>
  );

  if (!href) {
    return <div className="flex items-center gap-2 self-start">{mark}</div>;
  }

  return (
    <Link className="flex items-center gap-2 self-start" href={href}>
      {mark}
    </Link>
  );
}
