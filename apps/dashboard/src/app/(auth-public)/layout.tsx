import Link from "next/link";

import { PixelBlastBackground } from "@/components/auth/pixel-blast-background";

export default function AuthPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-xl supports-[corner-shape:squircle]:rounded-2xl">
            <PixelBlastBackground />
          </div>
        </div>
      </div>

      <section className="flex h-full flex-col items-center justify-between p-4">
        <div className="self-start">
          <h1 className="sr-only font-semibold uppercase">Notra</h1>
        </div>
        <div className="w-full max-w-md">{children}</div>
        <div>
          <p className="text-muted-foreground px-8 text-center text-xs">
            By continuing, you agree to our{" "}
            <Link
              className="hover:text-primary underline underline-offset-4"
              href="https://usenotra.com/terms"
              rel="noopener noreferrer"
              target="_blank"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="hover:text-primary underline underline-offset-4"
              href="https://usenotra.com/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
