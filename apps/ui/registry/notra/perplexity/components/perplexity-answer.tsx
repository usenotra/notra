import { cn } from "cn";

import type {
  PerplexityAnswerProps,
  PerplexityThreadCitation,
} from "../types/perplexity";
import { PerplexityCitation } from "./perplexity-citation";

const CITE_PATTERN = /(\{\{[a-z0-9-]+\}\})/;
const CITE_TOKEN_PATTERN = /^\{\{([a-z0-9-]+)\}\}$/;
const BOLD_PATTERN = /(\*\*[^*]+\*\*)/;
const BOLD_MARK = "**";
const LIST_MARK = "- ";

interface Segment {
  offset: number;
  text: string;
}

const splitWithOffsets = (
  text: string,
  separator: string | RegExp,
  separatorLength: number
) => {
  const segments: Segment[] = [];
  let offset = 0;
  for (const part of text.split(separator)) {
    if (part.length > 0) {
      segments.push({ offset, text: part });
    }
    offset += part.length + separatorLength;
  }
  return segments;
};

const isBold = (text: string) =>
  text.startsWith(BOLD_MARK) && text.endsWith(BOLD_MARK);

const InlineText = ({
  citations,
  text,
}: {
  citations: ReadonlyMap<string, PerplexityThreadCitation>;
  text: string;
}) => (
  <span className="min-w-0">
    {splitWithOffsets(text, CITE_PATTERN, 0).map((piece) => {
      const citeMatch = piece.text.match(CITE_TOKEN_PATTERN);
      if (citeMatch) {
        const citation = citations.get(citeMatch[1] ?? "");
        return citation ? (
          <PerplexityCitation
            extra={citation.extra}
            key={piece.offset}
            label={citation.label}
            sources={citation.sources}
          />
        ) : null;
      }

      return (
        <span key={piece.offset}>
          {splitWithOffsets(piece.text, BOLD_PATTERN, 0).map((part) =>
            isBold(part.text) ? (
              <strong className="font-bold" key={part.offset}>
                {part.text.slice(2, -2)}
              </strong>
            ) : (
              <span key={part.offset}>{part.text}</span>
            )
          )}
        </span>
      );
    })}
  </span>
);

export const PerplexityAnswer = ({
  citations = [],
  className,
  text,
  ...props
}: PerplexityAnswerProps) => {
  const lookup = new Map(citations.map((item) => [item.id, item]));
  const blocks = splitWithOffsets(text, "\n\n", 2);

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      data-slot="perplexity-answer"
      {...props}
    >
      {blocks.map((block) => {
        const lines = splitWithOffsets(block.text, "\n", 1);
        const isList = lines.every((line) => line.text.startsWith(LIST_MARK));
        const isHeading =
          lines.length === 1 &&
          isBold(block.text) &&
          !block.text.slice(2, -2).includes(BOLD_MARK);

        if (isHeading) {
          return (
            <h3
              className="font-pplx-serif mt-1 text-lg leading-7 font-semibold"
              key={block.offset}
            >
              {block.text.slice(2, -2)}
            </h3>
          );
        }

        if (isList) {
          return (
            <ul
              className="flex list-disc flex-col gap-2 ps-8.5"
              key={block.offset}
            >
              {lines.map((line) => (
                <li className="ps-1.5" key={line.offset}>
                  <InlineText
                    citations={lookup}
                    text={line.text.slice(LIST_MARK.length)}
                  />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={block.offset}>
            <InlineText citations={lookup} text={block.text} />
          </p>
        );
      })}
    </div>
  );
};
