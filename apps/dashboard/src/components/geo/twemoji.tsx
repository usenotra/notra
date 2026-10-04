import { useLocale } from "use-intl";

import Image from "@/components/framework/image";
import { TWEMOJI_FLAG_BASE, TWEMOJI_FLAG_SIZE } from "@/constants/country";
import type { CountryFlagProps, TwemojiProps } from "@/types/geo";
import {
  countryFlagCodePoints,
  countryName,
  emojiCodePoints,
} from "@/utils/country";

export function Twemoji({ emoji, label, className }: TwemojiProps) {
  const codePoints = emojiCodePoints(emoji);
  if (!codePoints) {
    return null;
  }

  return (
    <Image
      alt={label}
      className={className}
      height={TWEMOJI_FLAG_SIZE}
      src={`${TWEMOJI_FLAG_BASE}/${codePoints}.svg`}
      unoptimized
      width={TWEMOJI_FLAG_SIZE}
    />
  );
}

export function CountryFlag({ code, className }: CountryFlagProps) {
  const locale = useLocale();
  const codePoints = countryFlagCodePoints(code);
  if (!codePoints) {
    return null;
  }

  return (
    <Image
      alt={countryName(code, locale)}
      className={className}
      height={TWEMOJI_FLAG_SIZE}
      src={`${TWEMOJI_FLAG_BASE}/${codePoints}.svg`}
      unoptimized
      width={TWEMOJI_FLAG_SIZE}
    />
  );
}
