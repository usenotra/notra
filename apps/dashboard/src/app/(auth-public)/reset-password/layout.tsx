import PixelBlast from "@/components/PixelBlast";

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-xl supports-[corner-shape:squircle]:rounded-2xl">
            <PixelBlast
              color="#8b5cf6"
              edgeFade={0}
              patternDensity={1.5}
              patternScale={1}
              speed={0.5}
            />
          </div>
        </div>
      </div>

      <section className="flex h-full flex-col items-center justify-center p-4">
        {children}
      </section>
    </div>
  );
}
