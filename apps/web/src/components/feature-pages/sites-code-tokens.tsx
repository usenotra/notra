import type { SitesCodeTokensProps, SitesCodeTone } from "@/types/sites-page";

const CODE_TONE_CLASS: Record<SitesCodeTone, string> = {
  plain: "text-[#E7E3F0]",
  muted: "text-[#8C86A0]",
  key: "text-[#C4B5FD]",
  string: "text-[#86EFAC]",
  tag: "text-[#F9A8D4]",
  attr: "text-[#FCD34D]",
};

export function SitesCodeTokens({ line }: SitesCodeTokensProps) {
  return (
    <>
      {line.map(([tone, text], index) => (
        <span
          className={CODE_TONE_CLASS[tone]}
          // biome-ignore lint/suspicious/noArrayIndexKey: static code sample
          key={index}
        >
          {text}
        </span>
      ))}
    </>
  );
}
