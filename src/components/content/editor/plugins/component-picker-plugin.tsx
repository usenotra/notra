"use client";

import { $createCodeNode } from "@lexical/code";
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
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type TextNode,
} from "lexical";
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
      <span className="flex size-5 items-center justify-center text-muted-foreground">
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
        icon: <Pilcrow className="size-4" />,
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
        icon: <Heading1 className="size-4" />,
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
        icon: <Heading2 className="size-4" />,
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
        icon: <Heading3 className="size-4" />,
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
        icon: <List className="size-4" />,
        keywords: ["ul", "unordered", "bullet", "list"],
        onSelect: () =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption("Numbered List", {
        icon: <ListOrdered className="size-4" />,
        keywords: ["ol", "ordered", "number", "list"],
        onSelect: () =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption("Quote", {
        icon: <Quote className="size-4" />,
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
        icon: <Code className="size-4" />,
        keywords: ["code", "codeblock", "snippet"],
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createCodeNode());
            }
          }),
      }),
      new ComponentPickerOption("Divider", {
        icon: <Minus className="size-4" />,
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
              <div className="min-w-[180px] overflow-hidden rounded-lg border bg-popover p-1 shadow-lg">
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
