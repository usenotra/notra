import { cn } from "cn";

import {
  geminiCitationId,
  splitGeminiBold,
  splitGeminiCitations,
  splitGeminiParagraphs,
} from "../lib/gemini-text";
import type { GeminiSource, GeminiStoryTextProps } from "../types/gemini";
import { GeminiSourceChip } from "./gemini-source-chip";

const GeminiBoldText = ({ text }: { text: string }) => (
  <>
    {splitGeminiBold(text).map((part) =>
      part.text.startsWith("**") && part.text.endsWith("**") ? (
        <strong key={part.offset}>{part.text.slice(2, -2)}</strong>
      ) : (
        <span key={part.offset}>{part.text}</span>
      )
    )}
  </>
);

const GeminiInlineText = ({
  sources,
  text,
}: {
  sources: ReadonlyMap<string, GeminiSource>;
  text: string;
}) => (
  <>
    {splitGeminiCitations(text).map((piece) => {
      const id = geminiCitationId(piece.text);
      if (id === null) {
        return <GeminiBoldText key={piece.offset} text={piece.text} />;
      }
      const source = sources.get(id);
      return source ? (
        <GeminiSourceChip key={piece.offset} source={source} />
      ) : null;
    })}
  </>
);

export const GeminiStoryText = ({
  className,
  sources = [],
  text,
  ...props
}: GeminiStoryTextProps) => {
  const lookup = new Map(sources.map((source) => [source.id, source]));

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-slot="gemini-story-text"
      {...props}
    >
      {splitGeminiParagraphs(text).map((paragraph) => (
        <p key={paragraph.offset}>
          <GeminiInlineText sources={lookup} text={paragraph.text} />
        </p>
      ))}
    </div>
  );
};
