import {
  ClipboardIcon,
  Database01Icon,
  FileIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavDocumentsItem {
  name: string;
  url: string;
  icon: IconSvgElement;
}

const items: readonly NavDocumentsItem[] = [
  {
    name: "Data Library",
    url: "#",
    icon: Database01Icon,
  },
  {
    name: "Reports",
    url: "#",
    icon: ClipboardIcon,
  },
  {
    name: "Word Assistant",
    url: "#",
    icon: FileIcon,
  },
];

export function NavDocuments() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              render={
                <Link href={item.url}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.name}</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
