"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";

import { SPRING } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";

const TabsLayoutIdContext = createContext<string | null>(null);

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "gap-2 group/tabs flex data-[orientation=horizontal]:flex-col",
        className
      )}
      data-orientation={orientation}
      data-slot="tabs"
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list text-muted-foreground relative z-0 inline-flex w-fit items-center justify-center gap-0.5 rounded-lg p-0.5 group-data-horizontal/tabs:h-8 data-[variant=line]:rounded-none group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const layoutId = useId();

  return (
    <TabsLayoutIdContext.Provider value={variant === "line" ? layoutId : null}>
      <TabsPrimitive.List
        className={cn(tabsListVariants({ variant }), className)}
        data-slot="tabs-list"
        data-variant={variant}
        {...props}
      >
        {children}
        {variant === "default" ? (
          <TabsPrimitive.Indicator className="pointer-events-none absolute top-0 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-md bg-background shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-[width,height,translate] duration-slow ease-emphasized dark:bg-foreground/10" />
        ) : null}
      </TabsPrimitive.List>
    </TabsLayoutIdContext.Provider>
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: TabsPrimitive.Tab.Props) {
  const layoutId = useContext(TabsLayoutIdContext);
  const ref = useRef<HTMLButtonElement>(null);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSelected = () => {
      setIsSelected(element.hasAttribute("data-selected") || element.hasAttribute("data-active"));
    };

    const observer = new MutationObserver(updateSelected);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-selected", "data-active"],
    });
    updateSelected();

    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.Tab
      className={cn(
        "text-muted-foreground/75 hover:text-muted-foreground relative z-1 inline-flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 text-sm font-medium outline-2 outline-transparent transition-colors duration-normal ease-in-out focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:text-foreground dark:data-active:border-transparent dark:data-active:text-foreground",
        !layoutId &&
          "after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      data-slot="tabs-trigger"
      ref={ref}
      {...props}
    >
      {children}
      {layoutId && isSelected && (
        <motion.span
          className="absolute inset-x-0 bottom-[-5px] h-0.5 bg-foreground group-data-[orientation=vertical]/tabs:inset-x-auto group-data-[orientation=vertical]/tabs:inset-y-0 group-data-[orientation=vertical]/tabs:-right-1 group-data-[orientation=vertical]/tabs:w-0.5"
          layoutId={layoutId}
          transition={SPRING.indicator}
        />
      )}
    </TabsPrimitive.Tab>
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("text-sm flex-1", className)}
      data-slot="tabs-content"
      tabIndex={-1}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
