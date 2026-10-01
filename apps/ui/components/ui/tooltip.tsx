"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";
import {
  createContext,
  type ReactNode,
  use,
  useLayoutEffect,
  useState,
} from "react";

type TooltipPlacement = Pick<
  TooltipPrimitive.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset"
>;

type TooltipContentProps = TooltipPrimitive.Popup.Props & TooltipPlacement;

interface SharedTooltipPayload extends TooltipPlacement {
  children: ReactNode;
  className?: string;
}

interface SharedTooltipItem {
  payload: SharedTooltipPayload | undefined;
  setPayload: (payload: SharedTooltipPayload | undefined) => void;
}

const tooltipContentClassName =
  "border-foreground/60 to-foreground text-background z-50 block w-fit max-w-xs origin-(--transform-origin) rounded-[0.625rem] border bg-linear-to-b from-[color-mix(in_oklab,var(--color-foreground),var(--color-background)_10%)] px-2.5 py-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.16),0_6px_16px_-4px_rgba(0,0,0,0.24)] transition-[opacity,scale,translate] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [corner-shape:squircle] has-[[data-slot=kbd]]:pr-1 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-0.5 data-[side=left]:data-starting-style:translate-x-0.5 data-[side=right]:data-starting-style:-translate-x-0.5 data-[side=top]:data-starting-style:translate-y-0.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm **:data-[slot=kbd]:align-middle **:data-[slot=kbd-group]:ms-1.5 **:data-[slot=kbd-group]:align-middle *:data-[slot=kbd]:ms-1.5 [--tooltip-arrow:var(--color-foreground)] **:[--color-border:color-mix(in_oklab,var(--color-background)_18%,transparent)] **:[--color-foreground:var(--color-background)] **:[--color-muted-foreground:color-mix(in_oklab,var(--color-background)_65%,transparent)] motion-reduce:transition-opacity";

const TOOLTIP_ARROW_CLASS_NAME =
  "bg-(--tooltip-arrow) fill-(--tooltip-arrow) -z-10 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5";

// Inside a TooltipProvider every tooltip shares one popup, so moving between
// neighbours glides it over and resizes it instead of closing and reopening.
const SHARED_POSITIONER_CLASS_NAME =
  "h-(--positioner-height) w-(--positioner-width) transition-[top,left,right,bottom] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";
const SHARED_POPUP_CLASS_NAME =
  "h-(--popup-height) w-(--popup-width) max-w-none p-0 has-[[data-slot=kbd]]:pr-0 transition-[opacity,scale,translate,width,height] motion-reduce:transition-opacity";
const SHARED_VIEWPORT_CLASS_NAME =
  "relative m-0! overflow-hidden rounded-[inherit] [&>[data-previous]]:hidden";
// The label keeps its own natural width, so it never reflows while the popup
// resizes around it.
const SHARED_CONTENT_CLASS_NAME =
  "w-max max-w-xs px-2.5 py-1 has-[[data-slot=kbd]]:pr-1";
const SHARED_ARROW_CLASS_NAME =
  "transition-[left,top] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

const SharedTooltipContext =
  createContext<TooltipPrimitive.Handle<SharedTooltipPayload> | null>(null);
const SharedTooltipItemContext = createContext<SharedTooltipItem | null>(null);

function TooltipFrame({
  align = "center",
  alignOffset = 0,
  children,
  className,
  contentClassName,
  shared = false,
  side = "top",
  sideOffset = 4,
  ...props
}: TooltipContentProps & { contentClassName?: string; shared?: boolean }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          "isolate z-50 w-max",
          shared && SHARED_POSITIONER_CLASS_NAME
        )}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            tooltipContentClassName,
            className,
            shared && contentClassName,
            shared && SHARED_POPUP_CLASS_NAME
          )}
          {...props}
        >
          {shared ? (
            <TooltipPrimitive.Viewport className={SHARED_VIEWPORT_CLASS_NAME}>
              <div className={cn(SHARED_CONTENT_CLASS_NAME, contentClassName)}>
                {children}
              </div>
            </TooltipPrimitive.Viewport>
          ) : (
            children
          )}
          <TooltipPrimitive.Arrow
            className={cn(
              TOOLTIP_ARROW_CLASS_NAME,
              shared && SHARED_ARROW_CLASS_NAME
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

function TooltipProvider({
  children,
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  const [handle] = useState(() =>
    TooltipPrimitive.createHandle<SharedTooltipPayload>()
  );

  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    >
      <SharedTooltipContext value={handle}>
        {children}
        <TooltipPrimitive.Root handle={handle}>
          {({ payload }) => {
            const {
              children: content,
              className: contentClassName,
              ...frameProps
            } = (payload as SharedTooltipPayload | undefined) ?? {};
            return (
              <TooltipFrame
                contentClassName={contentClassName}
                shared
                {...frameProps}
              >
                {content}
              </TooltipFrame>
            );
          }}
        </TooltipPrimitive.Root>
      </SharedTooltipContext>
    </TooltipPrimitive.Provider>
  );
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  const handle = use(SharedTooltipContext);
  const [payload, setPayload] = useState<SharedTooltipPayload>();

  if (handle) {
    return (
      <SharedTooltipItemContext value={{ payload, setPayload }}>
        {props.children as ReactNode}
      </SharedTooltipItemContext>
    );
  }

  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  const handle = use(SharedTooltipContext);
  const item = use(SharedTooltipItemContext);

  if (handle && item) {
    return (
      <TooltipPrimitive.Trigger
        data-slot="tooltip-trigger"
        disabled={!item.payload}
        handle={handle}
        payload={item.payload}
        {...props}
      />
    );
  }

  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function SharedTooltipContent({
  setPayload,
  ...payload
}: SharedTooltipPayload & { setPayload: SharedTooltipItem["setPayload"] }) {
  const { align, alignOffset, children, className, side, sideOffset } = payload;

  useLayoutEffect(() => {
    setPayload({ align, alignOffset, children, className, side, sideOffset });
  }, [align, alignOffset, children, className, setPayload, side, sideOffset]);

  useLayoutEffect(() => () => setPayload(undefined), [setPayload]);

  return null;
}

function TooltipContent({
  children,
  className,
  ...props
}: TooltipContentProps) {
  const item = use(SharedTooltipItemContext);

  if (item) {
    return (
      <SharedTooltipContent
        align={props.align}
        alignOffset={props.alignOffset}
        className={typeof className === "string" ? className : undefined}
        setPayload={item.setPayload}
        side={props.side}
        sideOffset={props.sideOffset}
      >
        {children as ReactNode}
      </SharedTooltipContent>
    );
  }

  return (
    <TooltipFrame className={className} {...props}>
      {children}
    </TooltipFrame>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  tooltipContentClassName,
};
