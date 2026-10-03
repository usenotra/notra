const REGIONAL_INDICATOR_OFFSET = 0x1_f1_a5;
const COUNTRY_CODE_LENGTH = 2;

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export function countryFlagCodePoints(code: string): string | null {
  const upper = code.trim().toUpperCase();
  if (upper.length !== COUNTRY_CODE_LENGTH || !COUNTRY_CODE_REGEX.test(upper)) {
    return null;
  }
  return [...upper]
    .map((char) =>
      (char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET).toString(16)
    )
    .join("-");
}

export function countryName(code: string, locale: string): string {
  const upper = code.trim().toUpperCase();
  if (upper.length !== COUNTRY_CODE_LENGTH) {
    return code;
  }
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(upper) ?? upper
    );
  } catch {
    return upper;
  }
}

const VARIATION_SELECTOR = 0xfe_0f;
const ZERO_WIDTH_JOINER = 0x20_0d;

export function emojiCodePoints(emoji: string): string | null {
  const points = [...emoji].flatMap((char) => {
    const point = char.codePointAt(0) ?? 0;
    const isIgnored =
      point === 0 ||
      point === VARIATION_SELECTOR ||
      point === ZERO_WIDTH_JOINER;
    return isIgnored ? [] : [point];
  });
  if (points.length === 0) {
    return null;
  }
  return points.map((point) => point.toString(16)).join("-");
}
