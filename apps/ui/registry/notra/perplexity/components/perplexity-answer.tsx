import { cn } from "cn";

import type {
  PerplexityAnswerProps,
  PerplexityThreadCitation,
} from "../types/perplexity";
import { PerplexityCitation } from "./perplexity-citation";

const CITE_PATTERN = /(\{\{\w+(?:-\w+)*\}\})/;
const CITE_TOKEN_PATTERN = /^\{\{(\w+(?:-\w+)*)\}\}$/;
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

interface InlineTextProps {
  citations: ReadonlyMap<string, PerplexityThreadCitation>;
  text: string;
}

const CitedText = ({ citations, text }: InlineTextProps) =>
  splitWithOffsets(text, CITE_PATTERN, 0).map((piece) => {
    const citeMatch = piece.text.match(CITE_TOKEN_PATTERN);
    if (!citeMatch) {
      return <span key={piece.offset}>{piece.text}</span>;
    }
    const citation = citations.get(citeMatch[1] ?? "");
    return citation ? (
      <PerplexityCitation
        extra={citation.extra}
        key={piece.offset}
        label={citation.label}
        sources={citation.sources}
      />
    ) : null;
  });

/** Bold is parsed first so a citation can sit inside a bold span. */
const InlineText = ({ citations, text }: InlineTextProps) => (
  <span className="min-w-0">
    {splitWithOffsets(text, BOLD_PATTERN, 0).map((part) =>
      isBold(part.text) ? (
        <strong className="font-bold" key={part.offset}>
          <CitedText citations={citations} text={part.text.slice(2, -2)} />
        </strong>
      ) : (
        <CitedText citations={citations} key={part.offset} text={part.text} />
      )
    )}
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
              <InlineText citations={lookup} text={block.text.slice(2, -2)} />
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
