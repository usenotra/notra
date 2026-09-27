"use client";

import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/button";
import type { NotFoundContentProps } from "@/types/components/not-found";

export function NotFoundContent({ className }: NotFoundContentProps) {
  const t = useTranslations("errors.notFound");
  const tErrorsShared = useTranslations("errors.shared");
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center px-4",
        className
      )}
    >
      <div className="text-center">
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="text-foreground mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base">
          {t("description")}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link className={cn(buttonVariants())} href="/">
            {tErrorsShared("goHome")}
          </Link>
          <button
            className={cn(buttonVariants({ variant: "outline" }))}
            onClick={() => router.back()}
            type="button"
          >
            {t("goBack")}
          </button>
        </div>
      </div>
    </div>
  );
}
