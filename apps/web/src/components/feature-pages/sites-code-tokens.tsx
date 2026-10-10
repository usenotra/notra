import type { SitesCodeTokensProps, SitesCodeTone } from "@/types/sites-page";

const CODE_TONE_CLASS: Record<SitesCodeTone, string> = {
  plain: "text-[#E7E3F0]",
  muted: "text-[#8C86A0]",
  key: "text-[#C4B5FD]",
  string: "text-[#86EFAC]",
  tag: "text-[#F9A8D4]",
  attr: "text-[#FCD34D]",
};

function withKeys(line: SitesCodeTokensProps["line"]) {
  let offset = 0;

  return line.map(([tone, text]) => {
    const key = `${offset}-${tone}`;
    offset += text.length;
    return { key, tone, text };
  });
}

export function SitesCodeTokens({ line }: SitesCodeTokensProps) {
  return (
    <>
      {withKeys(line).map((token) => (
        <span className={CODE_TONE_CLASS[token.tone]} key={token.key}>
          {token.text}
        </span>
      ))}
    </>
  );
}
