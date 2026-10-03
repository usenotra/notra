import Image from "@/components/framework/image";
import type { GeoPackageManagerIconProps } from "@/types/geo";

export function GeoPackageManagerIcon({ manager }: GeoPackageManagerIconProps) {
  switch (manager) {
    case "bun":
      return (
        <Image
          alt=""
          aria-hidden
          className="size-3.5 object-contain"
          height={14}
          src="/brands/package-managers/bun.svg"
          unoptimized
          width={14}
        />
      );
    case "pnpm":
      return (
        <>
          <Image
            alt=""
            aria-hidden
            className="size-3.5 object-contain dark:hidden"
            height={14}
            src="/brands/package-managers/pnpm.svg"
            unoptimized
            width={14}
          />
          <Image
            alt=""
            aria-hidden
            className="hidden size-3.5 object-contain dark:block"
            height={14}
            src="/brands/package-managers/pnpm-dark.svg"
            unoptimized
            width={14}
          />
        </>
      );
    case "yarn":
      return (
        <Image
          alt=""
          aria-hidden
          className="size-3.5 object-contain"
          height={14}
          src="/brands/package-managers/yarn.svg"
          unoptimized
          width={14}
        />
      );
    case "npm":
      return (
        <Image
          alt=""
          aria-hidden
          className="size-3.5 object-contain"
          height={14}
          src="/brands/package-managers/npm.svg"
          unoptimized
          width={14}
        />
      );
    default:
      return null;
  }
}
