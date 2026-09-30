"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@notra/ui/components/ui/button";
import { COMMAND_TABS_COPY_BUTTON_TRANSITION } from "@notra/ui/constants/command-tabs";
import { cn } from "@notra/ui/lib/utils";

interface CommandTabsItem {
  value: string;
  label: string;
  command: string;
  icon?: ReactNode;
}

interface CommandTabsProps {
  items: CommandTabsItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  tabsPosition?: "top" | "bottom" | "none";
  invertActiveIcon?: boolean;
  highlight?: boolean;
  label?: string;
  copyLabel?: string;
  copiedLabel?: string;
  scrollLabel?: string;
  onCopy?: (command: string) => void;
  className?: string;
}

const COPY_FEEDBACK_MS = 2000;
const SCROLLBAR_HIDE_MS = 800;
const PERCENT = 100;
const SCROLL_STEP_PX = 40;
const MotionButton = m.create(Button);

type CommandTokenType = "command" | "string" | "flag" | "plain";

interface CommandToken {
  text: string;
  type: CommandTokenType;
  start: number;
}

const COMMAND_TOKEN_RE = /"[^"]*"?|'[^']*'?|\s+|[^\s"']+/g;
const WHITESPACE_RE = /^\s+$/;

const TOKEN_CLASS: Record<CommandTokenType, string | undefined> = {
  command: "text-sky-600 dark:text-sky-400",
  string: "text-emerald-600 dark:text-emerald-400",
  flag: "text-muted-foreground",
  plain: undefined,
};

function classifyToken(text: string, isFirstWord: boolean): CommandTokenType {
  if (text.startsWith('"') || text.startsWith("'")) {
    return "string";
  }
  if (text.startsWith("-")) {
    return "flag";
  }
  return isFirstWord ? "command" : "plain";
}

function tokenizeCommand(command: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  let firstWord = true;
  let start = 0;
  for (const text of command.match(COMMAND_TOKEN_RE) ?? []) {
    if (WHITESPACE_RE.test(text)) {
      tokens.push({ text, type: "plain", start });
    } else {
      tokens.push({ text, type: classifyToken(text, firstWord), start });
      firstWord = false;
    }
    start += text.length;
  }
  return tokens;
}

function HighlightedCommand({ command }: { command: string }) {
  return tokenizeCommand(command).map((token) => (
    <span className={TOKEN_CLASS[token.type]} key={token.start}>
      {token.text}
    </span>
  ));
}

interface CommandTabProps {
  item: CommandTabsItem;
  isActive: boolean;
  invertIcon: boolean;
  onSelect: (value: string) => void;
}

function CommandTab({ item, isActive, invertIcon, onSelect }: CommandTabProps) {
  return (
    <button
      aria-pressed={isActive}
      className={cn(
        "relative z-10 flex shrink-0 cursor-pointer items-center gap-2 rounded-[calc(var(--radius-xl)-6px)] px-3 py-1.5 font-medium text-sm outline-none transition-colors duration-slow ease-out focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "text-primary-foreground dark:text-white"
          : "text-muted-foreground hover:text-foreground"
      )}
      data-value={item.value}
      onClick={() => onSelect(item.value)}
      type="button"
    >
      {item.icon && (
        <span
          className={cn(
            "flex shrink-0 items-center [&_svg]:size-4",
            isActive &&
              invertIcon &&
              "[&_svg]:fill-current [&_svg_path]:fill-current"
          )}
        >
          {item.icon}
        </span>
      )}
      <span className="whitespace-nowrap">{item.label}</span>
    </button>
  );
}

function useActivePill(activeValue: string | undefined) {
  const menuRef = useRef<HTMLMenuElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(
    null
  );

  const measure = useCallback(() => {
    const menu = menuRef.current;
    if (!menu || activeValue === undefined) {
      setPill(null);
      return;
    }
    const active = menu.querySelector<HTMLButtonElement>(
      `[data-value="${CSS.escape(activeValue)}"]`
    );
    if (!active) {
      setPill(null);
      return;
    }
    setPill({ left: active.offsetLeft, width: active.offsetWidth });
  }, [activeValue]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    for (const tab of menu.querySelectorAll("[data-value]")) {
      observer.observe(tab);
    }
    return () => observer.disconnect();
  }, [measure]);

  return { menuRef, pill };
}

function useFloatingScrollbar(activeCommand: string | undefined) {
  const scrollRef = useRef<HTMLElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumb, setThumb] = useState({ widthPct: 0, leftPct: 0 });
  const [scrolling, setScrolling] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      setThumb({ widthPct: 0, leftPct: 0 });
      return;
    }
    setThumb({
      widthPct: (clientWidth / scrollWidth) * PERCENT,
      leftPct: (scrollLeft / scrollWidth) * PERCENT,
    });
  }, []);

  const handleScroll = useCallback(() => {
    measure();
    setScrolling(true);
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    hideTimeout.current = setTimeout(
      () => setScrolling(false),
      SCROLLBAR_HIDE_MS
    );
  }, [measure]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && activeCommand !== undefined) {
      el.scrollLeft = 0;
    }
    measure();
  }, [measure, activeCommand]);

  useEffect(
    () => () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    },
    []
  );

  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleThumbPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const el = scrollRef.current;
      if (!el) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStart.current = { x: event.clientX, scrollLeft: el.scrollLeft };
      setDragging(true);
    },
    []
  );

  const handleThumbPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const el = scrollRef.current;
      const start = dragStart.current;
      if (!(el && start)) {
        return;
      }
      const delta = event.clientX - start.x;
      el.scrollLeft =
        start.scrollLeft + delta * (el.scrollWidth / el.clientWidth);
    },
    []
  );

  const handleThumbPointerEnd = useCallback(() => {
    dragStart.current = null;
    setDragging(false);
  }, []);

  const handleThumbKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const el = scrollRef.current;
      if (!el) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        el.scrollLeft -= SCROLL_STEP_PX;
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        el.scrollLeft += SCROLL_STEP_PX;
      }
    },
    []
  );

  return {
    scrollRef,
    thumb,
    visible: scrolling || dragging,
    dragging,
    handleScroll,
    handleThumbPointerDown,
    handleThumbPointerMove,
    handleThumbPointerEnd,
    handleThumbKeyDown,
  };
}

interface ScrollbarThumbProps {
  controls: string;
  thumb: { widthPct: number; leftPct: number };
  visible: boolean;
  dragging: boolean;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerEnd: () => void;
  label: string;
}

function ScrollbarThumb({
  controls,
  thumb,
  visible,
  dragging,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  label,
}: ScrollbarThumbProps) {
  const scrollableTrackPct = PERCENT - thumb.widthPct;
  const valueNow =
    scrollableTrackPct > 0
      ? Math.round((thumb.leftPct / scrollableTrackPct) * PERCENT)
      : 0;

  return (
    <div
      aria-controls={controls}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemax={PERCENT}
      aria-valuemin={0}
      aria-valuenow={valueNow}
      className={cn(
        "absolute bottom-0 flex h-2.5 cursor-grab touch-none items-end transition-opacity duration-slow",
        "focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100",
        dragging && "cursor-grabbing",
        visible ? "opacity-100" : "opacity-0"
      )}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      role="scrollbar"
      style={{
        width: `${thumb.widthPct}%`,
        left: `${thumb.leftPct}%`,
      }}
      tabIndex={0}
    >
      <span
        className={cn(
          "h-1 w-full rounded-full bg-foreground/25",
          dragging && "bg-foreground/40"
        )}
      />
    </div>
  );
}

export function CommandTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  tabsPosition = "bottom",
  invertActiveIcon = true,
  highlight = false,
  label = "Choose a tool",
  copyLabel = "Copy",
  copiedLabel = "Copied",
  scrollLabel = "Scroll command",
  onCopy,
  className,
}: CommandTabsProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value
  );
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  const activeValue = value ?? internalValue;
  const activeItem = items.find((item) => item.value === activeValue);
  const { menuRef, pill } = useActivePill(
    tabsPosition === "none" ? undefined : activeValue
  );
  const {
    scrollRef,
    thumb,
    visible,
    dragging,
    handleScroll,
    handleThumbPointerDown,
    handleThumbPointerMove,
    handleThumbPointerEnd,
    handleThumbKeyDown,
  } = useFloatingScrollbar(activeItem?.command);
  const commandId = useId();

  useEffect(
    () => () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    },
    []
  );

  const handleSelect = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  const handleCopy = async () => {
    if (!activeItem) {
      return;
    }
    try {
      await navigator.clipboard.writeText(activeItem.command);
      onCopy?.(activeItem.command);
      setCopied(true);
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
      copyTimeout.current = setTimeout(
        () => setCopied(false),
        COPY_FEEDBACK_MS
      );
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div
        className={cn(
          "relative z-10 flex items-center gap-2 rounded-xl border bg-muted/50 py-1.5 pr-1.5 pl-4",
          tabsPosition === "top" && "order-last"
        )}
      >
        <div className="group relative min-w-0 flex-1">
          <code
            className="block overflow-x-auto whitespace-nowrap py-1.5 font-mono text-foreground text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            id={commandId}
            onScroll={handleScroll}
            ref={scrollRef}
          >
            {activeItem &&
              (highlight ? (
                <HighlightedCommand command={activeItem.command} />
              ) : (
                activeItem.command
              ))}
          </code>
          {thumb.widthPct > 0 && (
            <ScrollbarThumb
              controls={commandId}
              dragging={dragging}
              label={scrollLabel}
              onKeyDown={handleThumbKeyDown}
              onPointerDown={handleThumbPointerDown}
              onPointerEnd={handleThumbPointerEnd}
              onPointerMove={handleThumbPointerMove}
              thumb={thumb}
              visible={visible}
            />
          )}
        </div>
        <LazyMotion features={domAnimation}>
          <MotionButton
            className="shrink-0 cursor-pointer overflow-hidden transition-[color,background-color,border-color,box-shadow,transform]"
            layout={!reduceMotion}
            onClick={handleCopy}
            size="sm"
            transition={COMMAND_TABS_COPY_BUTTON_TRANSITION}
            variant="outline"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <m.span
                animate={{
                  filter: "blur(0px)",
                  opacity: 1,
                  transform: "translateY(0%)",
                }}
                className="flex items-center gap-1"
                exit={{
                  filter: reduceMotion ? "blur(0px)" : "blur(5px)",
                  opacity: 0,
                  transform: reduceMotion
                    ? "translateY(0%)"
                    : "translateY(-70%)",
                }}
                initial={{
                  filter: reduceMotion ? "blur(0px)" : "blur(5px)",
                  opacity: 0,
                  transform: reduceMotion
                    ? "translateY(0%)"
                    : "translateY(70%)",
                }}
                key={copied ? "copied" : "copy"}
                transition={COMMAND_TABS_COPY_BUTTON_TRANSITION}
              >
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />
                <span>{copied ? copiedLabel : copyLabel}</span>
              </m.span>
            </AnimatePresence>
          </MotionButton>
        </LazyMotion>
      </div>
      {tabsPosition !== "none" && (
        <menu
          aria-label={label}
          className={cn(
            "relative m-0 flex w-fit max-w-[calc(100%-2rem)] list-none items-center gap-1 self-start overflow-x-auto overscroll-none border bg-muted/50 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            tabsPosition === "bottom"
              ? "-mt-px order-last ml-4 rounded-b-xl border-t-0"
              : "-mb-px order-first ml-4 rounded-t-xl border-b-0"
          )}
          ref={menuRef}
        >
          {pill && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1.5 left-0 rounded-[calc(var(--radius-xl)-6px)] bg-primary shadow-sm transition-transform duration-slow ease-out"
              style={{
                transform: `translateX(${pill.left}px)`,
                width: pill.width,
              }}
            />
          )}
          {items.map((item) => (
            <CommandTab
              invertIcon={invertActiveIcon}
              isActive={item.value === activeValue}
              item={item}
              key={item.value}
              onSelect={handleSelect}
            />
          ))}
        </menu>
      )}
    </div>
  );
}

export type { CommandTabsItem, CommandTabsProps };
