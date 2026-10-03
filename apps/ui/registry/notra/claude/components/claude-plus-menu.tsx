"use client";

import { cn } from "cn";
import {
  BlocksIcon,
  PaletteIcon,
  PaperclipIcon,
  PlugIcon,
  PlusIcon,
  ScrollTextIcon,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

import {
  CLAUDE_MENU_ITEM_CLASS,
  CLAUDE_MENU_SURFACE_CLASS,
  CLAUDE_PLUS_MENU_CONNECTORS,
  CLAUDE_PLUS_MENU_DESIGN_SYSTEMS,
  CLAUDE_PLUS_MENU_SKILLS,
} from "../constants/claude";
import type {
  ClaudePlusMenuItemId,
  ClaudePlusMenuProps,
} from "../types/claude";
import { ClaudeResearchIcon } from "./claude-icons";

const SUB_TRIGGER_CLASS = cn(
  CLAUDE_MENU_ITEM_CLASS,
  "data-open:bg-claude-hover data-open:text-claude-fg data-popup-open:bg-claude-hover data-popup-open:text-claude-fg [&>svg:last-child]:text-claude-muted [&>svg:last-child]:size-4"
);

const SEPARATOR_CLASS = "bg-claude-input-border mx-2 my-1.5";

const ICON_PROPS = { strokeWidth: 1.25 } as const;

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ClaudePlusSubmenu = ({
  icon: Icon,
  items,
  label,
  onSelect,
  prefix,
}: {
  icon: IconComponent;
  items: readonly string[];
  label: ReactNode;
  onSelect?: (item: ClaudePlusMenuItemId) => void;
  prefix: "skill" | "connector" | "design-system";
}) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger className={SUB_TRIGGER_CLASS} openOnHover>
      <Icon {...ICON_PROPS} />
      {label}
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent
      className={cn("min-w-44", CLAUDE_MENU_SURFACE_CLASS)}
      sideOffset={6}
    >
      {items.map((item) => (
        <DropdownMenuItem
          className={CLAUDE_MENU_ITEM_CLASS}
          key={item}
          onClick={() => onSelect?.(`${prefix}:${item}`)}
        >
          {item}
        </DropdownMenuItem>
      ))}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

export const ClaudePlusMenu = ({
  className,
  onSelect,
}: ClaudePlusMenuProps) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger
      render={
        <Button
          aria-label="Add files, connectors and more"
          className={cn(
            "text-claude-text hover:bg-claude-hover hover:text-claude-fg focus-visible:ring-claude-fg/20 aria-expanded:bg-claude-hover aria-expanded:text-claude-fg dark:hover:bg-claude-hover size-8 rounded-lg focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0",
            className
          )}
          data-slot="claude-plus-menu"
          size="icon"
          type="button"
          variant="ghost"
        />
      }
    >
      <PlusIcon className="size-4.5" strokeWidth={1.25} />
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      className={cn("w-57", CLAUDE_MENU_SURFACE_CLASS)}
      side="top"
      sideOffset={8}
    >
      <DropdownMenuItem
        className={CLAUDE_MENU_ITEM_CLASS}
        onClick={() => onSelect?.("add-files")}
      >
        <PaperclipIcon {...ICON_PROPS} />
        Add files or photos
        <DropdownMenuShortcut className="tracking-normal">
          <KbdGroup className="text-claude-muted gap-1">
            <Kbd className="text-claude-muted h-auto min-w-0 bg-transparent px-0 text-sm font-normal">
              ⌘
            </Kbd>
            <Kbd className="text-claude-muted h-auto min-w-0 bg-transparent px-0 text-sm font-normal">
              U
            </Kbd>
          </KbdGroup>
        </DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator className={SEPARATOR_CLASS} />
      <ClaudePlusSubmenu
        icon={ScrollTextIcon}
        items={CLAUDE_PLUS_MENU_SKILLS}
        label="Skills"
        onSelect={onSelect}
        prefix="skill"
      />
      <ClaudePlusSubmenu
        icon={BlocksIcon}
        items={CLAUDE_PLUS_MENU_CONNECTORS}
        label="Connectors"
        onSelect={onSelect}
        prefix="connector"
      />
      <ClaudePlusSubmenu
        icon={PaletteIcon}
        items={CLAUDE_PLUS_MENU_DESIGN_SYSTEMS}
        label="Design system"
        onSelect={onSelect}
        prefix="design-system"
      />
      <DropdownMenuItem
        className={CLAUDE_MENU_ITEM_CLASS}
        onClick={() => onSelect?.("add-plugins")}
      >
        <PlugIcon {...ICON_PROPS} />
        Add plugins
      </DropdownMenuItem>
      <DropdownMenuSeparator className={SEPARATOR_CLASS} />
      <DropdownMenuItem
        className={CLAUDE_MENU_ITEM_CLASS}
        onClick={() => onSelect?.("research")}
      >
        <ClaudeResearchIcon />
        Research
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
