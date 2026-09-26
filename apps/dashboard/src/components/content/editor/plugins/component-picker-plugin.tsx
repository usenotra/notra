"use client";

import {
  CodeIcon,
  Film01Icon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  ImageAdd01Icon,
  LeftToRightListNumberIcon,
  MinusSignIcon,
  ParagraphBulletsPoint01Icon,
  ParagraphIcon,
  QuoteUpIcon,
  Table01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/extension";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  type TextNode,
} from "lexical";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { $createKiboCodeBlockNode } from "../nodes/kibo-code-block-node";
import {
  OPEN_CONTENT_IMAGE_UPLOAD_COMMAND,
  OPEN_CONTENT_VIDEO_UPLOAD_COMMAND,
} from "./content-media-commands";

class ComponentPickerOption extends MenuOption {
  title: string;
  icon: React.ReactNode;
  keywords: string[];
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: {
      icon: React.ReactNode;
      keywords?: string[];
      onSelect: (queryString: string) => void;
    }
  ) {
    super(title);
    this.title = title;
    this.icon = options.icon;
    this.keywords = options.keywords ?? [];
    this.onSelect = options.onSelect;
  }
}

function ComponentPickerMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: ComponentPickerOption;
}) {
  return (
    <div
      aria-selected={isSelected}
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        isSelected ? "bg-accent text-accent-foreground" : "text-foreground"
      }`}
      id={`typeahead-item-${index}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={onMouseEnter}
      ref={(el) => {
        if (isSelected && el) {
          el.scrollIntoView({ block: "nearest" });
        }
      }}
      role="option"
      tabIndex={-1}
    >
      <span className="text-muted-foreground flex size-5 items-center justify-center">
        {option.icon}
      </span>
      <span>{option.title}</span>
    </div>
  );
}

export function ComponentPickerPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const baseOptions = useMemo(() => {
    return [
      new ComponentPickerOption("Paragraph", {
        icon: <HugeiconsIcon icon={ParagraphIcon} className="size-4" />,
        keywords: ["normal", "text", "p"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createParagraphNode());
            }
          }),
      }),
      new ComponentPickerOption("Heading 1", {
        icon: <HugeiconsIcon icon={Heading01Icon} className="size-4" />,
        keywords: ["h1", "header", "title"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode("h1"));
            }
          }),
      }),
      new ComponentPickerOption("Heading 2", {
        icon: <HugeiconsIcon icon={Heading02Icon} className="size-4" />,
        keywords: ["h2", "header", "subtitle"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode("h2"));
            }
          }),
      }),
      new ComponentPickerOption("Heading 3", {
        icon: <HugeiconsIcon icon={Heading03Icon} className="size-4" />,
        keywords: ["h3", "header", "subheading"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode("h3"));
            }
          }),
      }),
      new ComponentPickerOption("Bulleted List", {
        icon: (
          <HugeiconsIcon
            icon={ParagraphBulletsPoint01Icon}
            className="size-4"
          />
        ),
        keywords: ["ul", "unordered", "bullet", "list"],
        onSelect: () =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption("Numbered List", {
        icon: (
          <HugeiconsIcon icon={LeftToRightListNumberIcon} className="size-4" />
        ),
        keywords: ["ol", "ordered", "number", "list"],
        onSelect: () =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption("Quote", {
        icon: <HugeiconsIcon icon={QuoteUpIcon} className="size-4" />,
        keywords: ["blockquote", "quotation"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createQuoteNode());
            }
          }),
      }),
      new ComponentPickerOption("Code Block", {
        icon: <HugeiconsIcon icon={CodeIcon} className="size-4" />,
        keywords: ["code", "codeblock", "snippet"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const codeBlock = $createKiboCodeBlockNode("", "typescript");
              $insertNodes([codeBlock]);
            }
          }),
      }),
      new ComponentPickerOption("Table", {
        icon: <HugeiconsIcon icon={Table01Icon} className="size-4" />,
        keywords: ["table", "grid", "spreadsheet", "rows", "columns"],
        onSelect: () =>
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: "3",
            rows: "3",
            includeHeaders: { rows: true, columns: false },
          }),
      }),
      new ComponentPickerOption("Image", {
        icon: <HugeiconsIcon icon={ImageAdd01Icon} className="size-4" />,
        keywords: ["image", "photo", "picture", "upload", "img"],
        onSelect: () => {
          queueMicrotask(() => {
            editor.dispatchCommand(
              OPEN_CONTENT_IMAGE_UPLOAD_COMMAND,
              undefined
            );
          });
        },
      }),
      new ComponentPickerOption("Video", {
        icon: <HugeiconsIcon icon={Film01Icon} className="size-4" />,
        keywords: ["video", "movie", "mp4", "webm", "clip"],
        onSelect: () => {
          queueMicrotask(() => {
            editor.dispatchCommand(
              OPEN_CONTENT_VIDEO_UPLOAD_COMMAND,
              undefined
            );
          });
        },
      }),
      new ComponentPickerOption("Divider", {
        icon: <HugeiconsIcon icon={MinusSignIcon} className="size-4" />,
        keywords: ["hr", "horizontal", "rule", "line", "divider"],
        onSelect: () =>
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
      }),
    ];
  }, [editor]);

  const options = useMemo(() => {
    if (queryString === null) {
      return baseOptions;
    }
    const query = queryString.toLowerCase();
    return baseOptions.filter(
      (option) =>
        option.title.toLowerCase().includes(query) ||
        option.keywords.some((keyword) => keyword.toLowerCase().includes(query))
    );
  }, [baseOptions, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect(matchingString);
        closeMenu();
      });
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) =>
        anchorElementRef.current && options.length > 0
          ? createPortal(
              <div className="bg-popover min-w-[180px] overflow-hidden rounded-lg border p-1 shadow-lg">
                <div className="max-h-[200px] overflow-y-auto" role="listbox">
                  {options.map((option, index) => (
                    <ComponentPickerMenuItem
                      index={index}
                      isSelected={selectedIndex === index}
                      key={option.key}
                      onClick={() => {
                        setHighlightedIndex(index);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      option={option}
                    />
                  ))}
                </div>
              </div>,
              anchorElementRef.current
            )
          : null
      }
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      options={options}
      triggerFn={checkForTriggerMatch}
    />
  );
}
