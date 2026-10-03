import { cn } from "@notra/ui/lib/utils";

import { MERCH_GALLERY_IMAGES, MERCH_PHOTO_CREDIT } from "@/constants/merch";

export function MerchGallery() {
  return (
    <section className="w-full px-6 pt-20 sm:pt-10">
      <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-3">
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
          {MERCH_GALLERY_IMAGES.map((image) => (
            <div
              className={cn(
                "overflow-clip rounded-[0.8125rem] ring-1 ring-[#ECECEC] dark:ring-white/10",
                image.offsetClassName
              )}
              key={image.src}
            >
              <img
                decoding="async"
                loading="lazy"
                alt={image.alt}
                className="aspect-3/4 w-full object-cover sm:aspect-4/5"
                height={1440}
                src={image.src}
                width={1080}
              />
            </div>
          ))}
        </div>
        <p className="text-right font-sans text-[0.8125rem] leading-4.5 tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
          {MERCH_PHOTO_CREDIT}
        </p>
      </div>
    </section>
  );
}
