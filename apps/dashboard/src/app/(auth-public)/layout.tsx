import { AuthLegalNotice } from "@/components/auth/auth-legal-notice";
import { PixelBlastBackground } from "@/components/auth/pixel-blast-background";

export const instant = true;

export default function AuthPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-md supports-[corner-shape:squircle]:rounded-2xl">
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
          <AuthLegalNotice />
        </div>
      </section>
    </div>
  );
}
