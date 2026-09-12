"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  AttachmentIcon,
  Cancel01Icon,
  Copy01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@notra/ui/components/ui/button-group";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { TABLE_CHROME_CLASS } from "@notra/ui/constants/table";
import { DownloadIcon, Maximize2Icon } from "lucide-react";
import type { FileUIPart, UIMessage } from "ai";
import Image from "next/image";
import type {
  ComponentProps,
  HTMLAttributes,
  ReactElement,
} from "react";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Streamdown } from "streamdown";
import {
  MESSAGE_TABLE_COPY_FORMATS,
  MESSAGE_TABLE_COPY_RESET_MS,
} from "@notra/ui/constants/message-table";
import {
  tableDataToCopyFormat,
  tableDataToCsv,
  tableDataToMarkdown,
} from "@notra/ui/lib/message-table";
import type {
  MessageTableCopyFormat,
  MessageTableData,
} from "@notra/ui/types/message-table";
import { cn } from "@notra/ui/lib/utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] min-w-0 flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = (newBranch: number) => {
    setCurrentBranch(newBranch);
    onBranchChange?.(newBranch);
  };

  const goToPrevious = () => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  };

  const goToNext = () => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  };

  const contextValue: MessageBranchContextType = {
    currentBranch,
    totalBranches: branches.length,
    goToPrevious,
    goToNext,
    branches,
    setBranches,
  };

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = Array.isArray(children) ? children : [children];

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const MessageBranchSelector = ({
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md"
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      {children ?? <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      {children ?? <HugeiconsIcon icon={ArrowRight01Icon} size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({
  className,
  ...props
}: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

type MarkdownTableProps = ComponentProps<"table"> & {
  node?: unknown;
};

function readTableData(table: HTMLTableElement): MessageTableData {
  const headers = Array.from(table.querySelectorAll("thead th")).map((cell) =>
    cell.textContent?.trim() ?? ""
  );
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  const fallbackRows =
    bodyRows.length > 0 ? bodyRows : Array.from(table.querySelectorAll("tr"));
  const rows = fallbackRows
    .map((row) =>
      Array.from(row.querySelectorAll("td")).map(
        (cell) => cell.textContent?.trim() ?? ""
      )
    )
    .filter((row) => row.length > 0);

  if (headers.length > 0) {
    return { headers, rows };
  }

  const [firstRow, ...remainingRows] = rows;
  return {
    headers: firstRow ?? [],
    rows: remainingRows,
  };
}

async function writeClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }
  await navigator.clipboard.writeText(value);
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function MessageMarkdownTable({
  children,
  className,
  node: _node,
  ...props
}: MarkdownTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const toolbarOpen = copyMenuOpen || downloadMenuOpen || copied;

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    },
    []
  );

  const getData = () => {
    if (!tableRef.current) {
      return { headers: [], rows: [] };
    }
    return readTableData(tableRef.current);
  };

  const markCopied = () => {
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(
      () => setCopied(false),
      MESSAGE_TABLE_COPY_RESET_MS
    );
  };

  const copyAs = async (format: MessageTableCopyFormat) => {
    await writeClipboard(tableDataToCopyFormat(getData(), format));
    markCopied();
  };

  const copyMarkdown = async () => {
    await copyAs("markdown");
  };

  const downloadCsv = () => {
    downloadText("table.csv", tableDataToCsv(getData()), "text/csv");
  };

  const downloadMarkdown = () => {
    downloadText(
      "table.md",
      tableDataToMarkdown(getData()),
      "text/markdown"
    );
  };

  const renderTable = () => (
    <div className="max-w-full overflow-x-auto">
      <table
        className={cn(
          "w-full min-w-max caption-bottom border-separate border-spacing-0 text-sm [&_thead_th:last-child]:pr-24",
          className
        )}
        ref={tableRef}
        {...props}
      >
        {children}
      </table>
    </div>
  );

  return (
    <div
      className={cn(
        "group/table relative max-w-full",
        TABLE_CHROME_CLASS,
        toolbarOpen && "is-menu-open"
      )}
    >
      <div className="absolute top-1 right-1.5 z-10">
        <div
          className={cn(
            "flex items-center gap-1 rounded-md border bg-background/90 p-0.5 opacity-0 shadow-sm transition-opacity group-focus-within/table:opacity-100 group-hover/table:opacity-100 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur",
            toolbarOpen && "opacity-100"
          )}
        >
          <ContextMenu onOpenChange={setCopyMenuOpen}>
            <Tooltip>
              <ContextMenuTrigger
                render={
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={() => {
                          copyMarkdown().catch(() => undefined);
                        }}
                        size="icon-xs"
                        variant="ghost"
                      />
                    }
                  />
                }
              >
                <HugeiconsIcon
                  className="size-3.5"
                  icon={copied ? Tick01Icon : Copy01Icon}
                />
                <span className="sr-only">Copy table as Markdown</span>
              </ContextMenuTrigger>
              {copyMenuOpen ? null : (
                <TooltipContent>
                  {copied ? "Copied" : "Copy table as Markdown"}
                </TooltipContent>
              )}
            </Tooltip>
            <ContextMenuContent className="w-44 min-w-44">
              {MESSAGE_TABLE_COPY_FORMATS.map((format) => (
                <ContextMenuItem
                  className="whitespace-nowrap"
                  key={format.id}
                  onClick={() => {
                    copyAs(format.id).catch(() => undefined);
                  }}
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={format.icon}
                    strokeWidth={2}
                  />
                  {format.label}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
          <DropdownMenu
            onOpenChange={setDownloadMenuOpen}
            open={downloadMenuOpen}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={<Button size="icon-xs" variant="ghost" />}
                  />
                }
              >
                <DownloadIcon className="size-3.5" />
                <span className="sr-only">Download table</span>
              </TooltipTrigger>
              <TooltipContent>Download table</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="w-44 min-w-44"
            >
              <DropdownMenuItem
                className="whitespace-nowrap"
                onClick={downloadCsv}
              >
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                className="whitespace-nowrap"
                onClick={downloadMarkdown}
              >
                Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ResponsiveDialog>
            <Tooltip>
              <TooltipTrigger
                render={
                  <ResponsiveDialogTrigger
                    render={<Button size="icon-xs" variant="ghost" />}
                  />
                }
              >
                <Maximize2Icon className="size-3.5" />
                <span className="sr-only">View table fullscreen</span>
              </TooltipTrigger>
              <TooltipContent>View table fullscreen</TooltipContent>
            </Tooltip>
            <ResponsiveDialogContent
              className="flex h-[min(calc(100vh-2rem),900px)] max-h-[calc(100vh-2rem)] max-w-[min(calc(100vw-2rem),1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(calc(100vw-2rem),1200px)]"
              drawerClassName="h-[85svh] max-h-[85svh]"
              showCloseButton={false}
            >
              <ResponsiveDialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-4 py-2">
                <ResponsiveDialogTitle>Table</ResponsiveDialogTitle>
                <ResponsiveDialogClose
                  render={<Button size="icon-sm" variant="ghost" />}
                >
                  <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
                  <span className="sr-only">Close</span>
                </ResponsiveDialogClose>
              </ResponsiveDialogHeader>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div className={TABLE_CHROME_CLASS}>{renderTable()}</div>
              </div>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </div>
      {renderTable()}
    </div>
  );
}

function MessageTableHead({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"thead"> & { node?: unknown }) {
  return (
    <TableHeader className={cn("[&_tr]:hover:bg-transparent", className)} {...props}>
      {children}
    </TableHeader>
  );
}

function MessageTableBody({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"tbody"> & { node?: unknown }) {
  return (
    <TableBody className={className} {...props}>
      {children}
    </TableBody>
  );
}

function MessageTableRow({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"tr"> & { node?: unknown }) {
  return (
    <TableRow className={className} {...props}>
      {children}
    </TableRow>
  );
}

export function MessageTableHeaderCell({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"th"> & { node?: unknown }) {
  return (
    <TableHead className={className} {...props}>
      {children}
    </TableHead>
  );
}

export function MessageTableCell({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"td"> & { node?: unknown }) {
  return (
    <TableCell className={className} {...props}>
      {children}
    </TableCell>
  );
}

function MessageLink({
  children,
  className,
  href,
  node: _node,
  rel,
  target,
  ...props
}: ComponentProps<"a"> & { node?: unknown }) {
  const isExternal = typeof href === "string" && /^https?:\/\//i.test(href);

  return (
    <a
      className={cn(
        "font-medium text-foreground underline underline-offset-3 transition-colors hover:text-foreground/80",
        className
      )}
      href={href}
      rel={rel ?? (isExternal ? "noopener noreferrer" : undefined)}
      target={target ?? (isExternal ? "_blank" : undefined)}
      {...props}
    >
      {children}
    </a>
  );
}

const messageResponseComponents = {
  a: MessageLink,
  table: MessageMarkdownTable,
  thead: MessageTableHead,
  tbody: MessageTableBody,
  tr: MessageTableRow,
  th: MessageTableHeaderCell,
  td: MessageTableCell,
};

export const MessageResponse = memo(
  ({ className, components, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "wrap-anywhere size-full min-w-0 max-w-full overflow-hidden break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto",
        className
      )}
      components={{ ...messageResponseComponents, ...components }}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children && prevProps.mode === nextProps.mode
);

MessageResponse.displayName = "MessageResponse";

export type MessageAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
  className?: string;
  onRemove?: () => void;
};

export function MessageAttachment({
  data,
  className,
  onRemove,
  ...props
}: MessageAttachmentProps) {
  const filename = data.filename || "";
  const mediaType =
    data.mediaType?.startsWith("image/") && data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");

  return (
    <div
      className={cn(
        "group relative size-24 overflow-hidden rounded-lg",
        className
      )}
      {...props}
    >
      {isImage ? (
        <>
          <Image
            alt={filename || "attachment"}
            className="size-full object-cover"
            height={100}
            src={data.url}
            width={100}
          />
          {onRemove && (
            <Button
              aria-label="Remove attachment"
              className="absolute top-2 right-2 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100 [&>svg]:size-3"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              variant="ghost"
            >
              <HugeiconsIcon icon={Cancel01Icon} />
              <span className="sr-only">Remove</span>
            </Button>
          )}
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex size-full shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" />
              }
            >
              <HugeiconsIcon className="size-4" icon={AttachmentIcon} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{attachmentLabel}</p>
            </TooltipContent>
          </Tooltip>
          {onRemove && (
            <Button
              aria-label="Remove attachment"
              className="size-6 shrink-0 rounded-full p-0 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 [&>svg]:size-3"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              variant="ghost"
            >
              <HugeiconsIcon icon={Cancel01Icon} />
              <span className="sr-only">Remove</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export type MessageAttachmentsProps = ComponentProps<"div">;

export function MessageAttachments({
  children,
  className,
  ...props
}: MessageAttachmentsProps) {
  if (!children) {
    return null;
  }

  return (
    <div
      className={cn(
        "ml-auto flex w-fit flex-wrap items-start gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={cn(
      "mt-4 flex w-full items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
