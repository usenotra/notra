"use client";

import { FrameworkProvider } from "@notra/ui/components/framework-provider";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <FrameworkProvider Image={Image} Link={Link}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </FrameworkProvider>
  );
}
