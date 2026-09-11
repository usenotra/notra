"use client";

import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogTrigger,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@notra/ui/components/ui/breadcrumb";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@notra/ui/components/ui/button-group";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@notra/ui/components/ui/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@notra/ui/components/ui/combobox";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@notra/ui/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@notra/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@notra/ui/components/ui/field";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import {
  OnboardingChecklist,
  OnboardingChecklistContent,
  OnboardingChecklistHeader,
  OnboardingChecklistItem,
  OnboardingChecklistItems,
  OnboardingChecklistProgress,
  OnboardingChecklistTitle,
} from "@notra/ui/components/ui/onboarding-checklist";
import {
  Progress,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@notra/ui/components/ui/progress";
import { ScrollArea } from "@notra/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Separator } from "@notra/ui/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@notra/ui/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@notra/ui/components/ui/sidebar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Toaster } from "@notra/ui/components/ui/sonner";
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperNext,
  StepperPrev,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@notra/ui/components/ui/stepper";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";

import { DesignSystemChatgptCatalog } from "@/app/design-system/chatgpt/page-client";
import { DesignSystemClaudeChatCatalog } from "@/app/design-system/claude-chat/page-client";
import { DesignSystemClaudeCatalog } from "@/app/design-system/claude/page-client";
import { DesignSystemCodexCatalog } from "@/app/design-system/codex/page-client";
import { DesignSystemGeminiCatalog } from "@/app/design-system/gemini/page-client";
import { DesignSystemOpencodeCatalog } from "@/app/design-system/opencode/page-client";
import { DesignSystemPerplexityCatalog } from "@/app/design-system/perplexity/page-client";
import { Button, buttonVariants } from "@/components/button";
import ChatInput from "@/components/chat-input";
import { DesignSystemAuthSecurityDemo } from "@/components/design-system/auth-security-demo";
import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import { GeoRangePickerDemo } from "@/components/design-system/geo-range-picker-demo";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { LinkedInPost } from "@/components/linkedin-post";
import { cn } from "@/lib/utils";

import { DesignSystemWriteDialogDemo } from "./write-dialog-demo";

const colorGroups = [
  {
    title: "Base",
    tokens: [
      { name: "background", label: "Background" },
      { name: "foreground", label: "Foreground" },
      { name: "card", label: "Card" },
      { name: "card-foreground", label: "Card Foreground" },
      { name: "popover", label: "Popover" },
      { name: "popover-foreground", label: "Popover Foreground" },
    ],
  },
  {
    title: "Brand",
    tokens: [
      { name: "primary", label: "Primary" },
      { name: "primary-foreground", label: "Primary Foreground" },
      { name: "secondary", label: "Secondary" },
      { name: "secondary-foreground", label: "Secondary Foreground" },
      { name: "accent", label: "Accent" },
      { name: "accent-foreground", label: "Accent Foreground" },
      { name: "muted", label: "Muted" },
      { name: "muted-foreground", label: "Muted Foreground" },
      { name: "destructive", label: "Destructive" },
      { name: "destructive-foreground", label: "Destructive Foreground" },
      { name: "border", label: "Border" },
      { name: "input", label: "Input" },
      { name: "ring", label: "Ring" },
    ],
  },
  {
    title: "Status",
    tokens: [
      { name: "success", label: "Success" },
      { name: "warning", label: "Warning" },
      { name: "info", label: "Info" },
      { name: "destructive", label: "Destructive" },
      { name: "geo-up", label: "GEO Up (= success)" },
      { name: "geo-mid", label: "GEO Mid (= warning)" },
      { name: "geo-down", label: "GEO Down" },
      { name: "geo-search", label: "GEO Search" },
      { name: "geo-memory", label: "GEO Memory" },
    ],
  },
  {
    title: "Charts",
    tokens: [
      { name: "chart-1", label: "Chart 1" },
      { name: "chart-2", label: "Chart 2" },
      { name: "chart-3", label: "Chart 3" },
      { name: "chart-4", label: "Chart 4" },
      { name: "chart-5", label: "Chart 5" },
    ],
  },
  {
    title: "Sidebar",
    tokens: [
      { name: "sidebar", label: "Sidebar" },
      { name: "sidebar-foreground", label: "Sidebar Foreground" },
      { name: "sidebar-primary", label: "Sidebar Primary" },
      {
        name: "sidebar-primary-foreground",
        label: "Sidebar Primary Foreground",
      },
      { name: "sidebar-accent", label: "Sidebar Accent" },
      { name: "sidebar-accent-foreground", label: "Sidebar Accent Foreground" },
      { name: "sidebar-border", label: "Sidebar Border" },
      { name: "sidebar-ring", label: "Sidebar Ring" },
    ],
  },
];

const comboboxOptions = [
  "Editorial",
  "Engineering",
  "Marketing",
  "Product",
  "Design",
];
const commandItems = [
  { label: "New workspace", shortcut: "N" },
  { label: "Invite members", shortcut: "I" },
  { label: "Create report", shortcut: "R" },
];
const scrollItems = Array.from({ length: 12 }, (_, index) => ({
  id: `event-${index + 1}`,
  label: `Event #${index + 1}`,
}));
const mockIntegration = {
  id: "integration_1",
  displayName: "GitHub",
  enabled: true,
  managedByGitHubApp: true,
  createdAt: new Date().toISOString(),
  createdByUser: {
    id: "user_1",
    name: "Avery Lane",
    email: "avery@notra.ai",
    image: null,
  },
  repositories: [
    {
      id: "repo_1",
      owner: "notra",
      repo: "dashboard",
      defaultBranch: "main",
      enabled: true,
    },
    {
      id: "repo_2",
      owner: "notra",
      repo: "webhooks",
      defaultBranch: "main",
      enabled: true,
    },
  ],
};

function ColorSwatch({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div
        className="h-10 w-10 rounded-md border shadow-xs"
        style={{ backgroundColor: `var(--${name})` }}
      />
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">--{name}</div>
      </div>
    </div>
  );
}

/*
 * Tailwind must see these class strings literally, so each row spells out its
 * own utilities rather than interpolating the token name.
 */
const MOTION_DURATIONS = [
  {
    token: "duration-instant",
    meta: "100ms · popover layer",
    className: "duration-instant ease-out",
  },
  {
    token: "duration-fast",
    meta: "150ms · control feedback",
    className: "duration-fast ease-out",
  },
  {
    token: "duration-normal",
    meta: "200ms · state change in place",
    className: "duration-normal ease-out",
  },
  {
    token: "duration-slow",
    meta: "300ms · layout movement",
    className: "duration-slow ease-out",
  },
  {
    token: "duration-slower",
    meta: "500ms · deliberate reveal",
    className: "duration-slower ease-out",
  },
] as const;

const MOTION_EASINGS = [
  {
    token: "ease-out",
    meta: "default for small interactions",
    className: "duration-slower ease-out",
  },
  {
    token: "ease-emphasized",
    meta: "entrances and layout moves",
    className: "duration-slower ease-emphasized",
  },
  {
    token: "ease-emphasized-in",
    meta: "exits",
    className: "duration-slower ease-emphasized-in",
  },
  {
    token: "ease-emphasized-in-out",
    meta: "symmetric morphs",
    className: "duration-slower ease-emphasized-in-out",
  },
] as const;

function MotionSample({
  token,
  meta,
  className,
}: {
  token: string;
  meta: string;
  className: string;
}) {
  return (
    <div className="group/motion hover:bg-muted/40 rounded-lg px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <code className="text-xs font-medium">{token}</code>
        <span className="text-muted-foreground text-xs">{meta}</span>
      </div>
      <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "bg-primary h-full w-1/5 rounded-full transition-transform group-hover/motion:translate-x-[400%]",
            className
          )}
        />
      </div>
    </div>
  );
}

export default function DesignSystemClientPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [dropdownChecked, setDropdownChecked] = useState(true);
  const [dropdownRadio, setDropdownRadio] = useState("team");
  const [stepperValue, setStepperValue] = useState("review");
  const stepperSteps = ["details", "review", "launch"] as const;
  const activeStepIndex = stepperSteps.indexOf(
    stepperValue as (typeof stepperSteps)[number]
  );

  return (
    <DesignSystemFrame
      description="Full catalog: UI kit, Claude TUI, Codex TUI, ChatGPT chat, Claude chat, Gemini chat, and Perplexity. Everything is on this page."
      title="Notra UI Preview"
    >
      <section className="scroll-mt-10 space-y-6" id="colors">
        <DesignSystemSectionHeader
          description="Theme tokens from the dashboard CSS variables."
          id="colors"
          title="Colors"
        />
        <div className="space-y-6">
          {colorGroups.map((group) => (
            <div className="space-y-3" key={group.title}>
              <h3 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                {group.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.tokens.map((token) => (
                  <ColorSwatch key={token.name} {...token} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="motion">
        <DesignSystemSectionHeader
          description="One scale for every animation. Hover a row to play it."
          id="motion"
          title="Motion"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Durations</CardTitle>
              <CardDescription>
                Tailwind <code>duration-*</code> and <code>DURATION</code> from{" "}
                <code>@notra/ui/lib/motion</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {MOTION_DURATIONS.map((entry) => (
                <MotionSample
                  key={entry.token}
                  className={entry.className}
                  meta={entry.meta}
                  token={entry.token}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Easings</CardTitle>
              <CardDescription>
                Shown at <code>duration-slower</code> so the curve is legible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {MOTION_EASINGS.map((entry) => (
                <MotionSample
                  key={entry.token}
                  className={entry.className}
                  meta={entry.meta}
                  token={entry.token}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="buttons">
        <DesignSystemSectionHeader id="buttons" title="Buttons & Badges" />
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Variants and sizing options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button>Default</Button>
              <Button size="lg">LG</Button>
              <Button size="icon">◎</Button>
              <Button size="icon-xs">◎</Button>
              <Button size="icon-sm">◎</Button>
              <Button size="icon-lg">◎</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <ButtonGroup>
                <Button variant="outline">Left</Button>
                <Button variant="outline">Center</Button>
                <Button variant="outline">Right</Button>
              </ButtonGroup>
              <ButtonGroup>
                <ButtonGroupText>Filters</ButtonGroupText>
                <ButtonGroupSeparator />
                <Button variant="outline">Recent</Button>
              </ButtonGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>
              Variants and sizes. Reach for the status variants instead of
              hand-rolling emerald/amber/blue classes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
              <Badge variant="link">Link</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="sm">Small</Badge>
              <Badge size="sm" variant="success">
                Small success
              </Badge>
              <Badge size="sm" variant="outline">
                Small outline
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Card</CardTitle>
            <CardDescription>
              Composed header, content, and footer.
            </CardDescription>
            <CardAction>
              <Button size="sm" variant="outline">
                Action
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">Card content area</div>
            <p className="text-muted-foreground text-sm">
              Use cards for grouped UI elements and summaries.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Continue</Button>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="forms">
        <DesignSystemSectionHeader id="forms" title="Forms & Inputs" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>
                Single line, textarea, and switch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-input">Email</Label>
                <Input id="email-input" placeholder="hello@notra.ai" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message-input">Message</Label>
                <Textarea
                  id="message-input"
                  placeholder="Write a short message..."
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Notifications</Label>
                  <p className="text-muted-foreground text-xs">
                    Enable updates
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Input Group</CardTitle>
              <CardDescription>Grouped inputs with addons.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>https://</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput placeholder="notra.ai" />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton>Go</InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <InputGroup className="h-auto">
                <InputGroupAddon align="block-start">
                  <InputGroupText>Description</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput placeholder="Short summary" />
              </InputGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field Layout</CardTitle>
              <CardDescription>Field groups and labels.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldLegend>Profile</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldTitle>Name</FieldTitle>
                    <FieldContent>
                      <Input placeholder="Alex Johnson" />
                      <FieldDescription>
                        Displayed on your profile.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldTitle>Role</FieldTitle>
                    <FieldContent>
                      <Input placeholder="Product Manager" />
                      <FieldDescription>
                        Shown in team directories.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select & Combobox</CardTitle>
              <CardDescription>Picker components.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue="weekly">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Frequency</SelectLabel>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <Combobox>
                <ComboboxInput placeholder="Search team..." />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>No results.</ComboboxEmpty>
                    {comboboxOptions.map((option) => (
                      <ComboboxItem key={option} value={option}>
                        {option}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="navigation">
        <DesignSystemSectionHeader
          id="navigation"
          title="Navigation & Overlays"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Breadcrumbs</CardTitle>
            </CardHeader>
            <CardContent>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Automation</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Design System</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dropdown Menu</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  Open menu
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuItem>
                      Reports
                      <DropdownMenuShortcut>R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={dropdownChecked}
                    onCheckedChange={setDropdownChecked}
                  >
                    Notifications
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    onValueChange={setDropdownRadio}
                    value={dropdownRadio}
                  >
                    <DropdownMenuRadioItem value="team">
                      Team
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="personal">
                      Personal
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-muted-foreground text-xs">
                View: {dropdownRadio}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dialog & Alert Dialog</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
                <DialogTrigger render={<Button variant="outline" />}>
                  Open dialog
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite collaborators</DialogTitle>
                    <DialogDescription>
                      Send access to new team members.
                    </DialogDescription>
                  </DialogHeader>
                  <Input placeholder="Email address" />
                  <DialogFooter>
                    <Button
                      onClick={() => setDialogOpen(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button>Send invite</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <ResponsiveAlertDialog
                onOpenChange={setAlertDialogOpen}
                open={alertDialogOpen}
              >
                <ResponsiveAlertDialogTrigger
                  render={<Button variant="destructive" />}
                >
                  Delete item
                </ResponsiveAlertDialogTrigger>
                <ResponsiveAlertDialogContent>
                  <ResponsiveAlertDialogHeader>
                    <ResponsiveAlertDialogTitle>
                      Delete automation?
                    </ResponsiveAlertDialogTitle>
                    <ResponsiveAlertDialogDescription>
                      This action cannot be undone.
                    </ResponsiveAlertDialogDescription>
                  </ResponsiveAlertDialogHeader>
                  <ResponsiveAlertDialogFooter>
                    <ResponsiveAlertDialogCancel>
                      Cancel
                    </ResponsiveAlertDialogCancel>
                    <ResponsiveAlertDialogAction>
                      Delete
                    </ResponsiveAlertDialogAction>
                  </ResponsiveAlertDialogFooter>
                </ResponsiveAlertDialogContent>
              </ResponsiveAlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <Sheet onOpenChange={setSheetOpen} open={sheetOpen}>
                <SheetTrigger render={<Button variant="outline" />}>
                  Open sheet
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Quick settings</SheetTitle>
                    <SheetDescription>
                      Adjust your workspace preferences.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-3 p-4">
                    <div className="space-y-2">
                      <Label>Workspace name</Label>
                      <Input placeholder="Notra" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Sync updates</Label>
                      <Switch />
                    </div>
                  </div>
                  <SheetFooter>
                    <Button
                      onClick={() => setSheetOpen(false)}
                      variant="outline"
                    >
                      Close
                    </Button>
                    <Button>Save</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="feedback">
        <DesignSystemSectionHeader id="feedback" title="Feedback & Status" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertTitle>Automation running</AlertTitle>
                <AlertDescription>
                  The schedule will run again in 2 hours.
                </AlertDescription>
              </Alert>
              <Alert variant="info">
                <AlertTitle>Key shown once</AlertTitle>
                <AlertDescription>
                  Store it now — you will not be able to read it again.
                </AlertDescription>
              </Alert>
              <Alert variant="success">
                <AlertTitle>Scan complete</AlertTitle>
                <AlertDescription>
                  All 24 prompts were answered.
                </AlertDescription>
              </Alert>
              <Alert variant="warning">
                <AlertTitle>Approaching your limit</AlertTitle>
                <AlertDescription>
                  You have used 90% of this month&apos;s credits.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Connection failed</AlertTitle>
                <AlertDescription>
                  We could not reach the webhook endpoint.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={62}>
                <ProgressLabel>Processing</ProgressLabel>
                <ProgressValue>
                  {(formattedValue) => formattedValue ?? "0%"}
                </ProgressValue>
                <ProgressTrack />
              </Progress>
              <Progress value={100}>
                <ProgressLabel>Completed</ProgressLabel>
                <ProgressValue>
                  {(formattedValue) => formattedValue ?? "0%"}
                </ProgressValue>
                <ProgressTrack />
              </Progress>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skeletons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Toasts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                onClick={() => toast("Workspace synced")}
                variant="outline"
              >
                Default
              </Button>
              <Button
                onClick={() => toast.success("Deployment complete")}
                variant="outline"
              >
                Success
              </Button>
              <Button
                onClick={() => toast.error("Something went wrong")}
                variant="outline"
              >
                Error
              </Button>
              <Button
                onClick={() => toast.loading("Processing...")}
                variant="outline"
              >
                Loading
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="data-display">
        <DesignSystemSectionHeader id="data-display" title="Data Display" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tabs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <Tabs defaultValue="overview">
                  <TabsList variant="line">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <p className="text-muted-foreground text-sm">
                      Summary of your latest automation runs.
                    </p>
                  </TabsContent>
                  <TabsContent value="activity">
                    <p className="text-muted-foreground text-sm">
                      Recent workflow triggers and logs.
                    </p>
                  </TabsContent>
                  <TabsContent value="settings">
                    <p className="text-muted-foreground text-sm">
                      Update notification preferences.
                    </p>
                  </TabsContent>
                </Tabs>
                <Tabs defaultValue="overview">
                  <TabsList variant="line">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <p className="text-muted-foreground text-sm">
                      Line variant for lightweight navigation.
                    </p>
                  </TabsContent>
                  <TabsContent value="activity">
                    <p className="text-muted-foreground text-sm">
                      Focus on activity history and signals.
                    </p>
                  </TabsContent>
                  <TabsContent value="settings">
                    <p className="text-muted-foreground text-sm">
                      Configure preferences and access.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Latest workflow runs</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Run time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Brand audit</TableCell>
                    <TableCell>Success</TableCell>
                    <TableCell>1m 12s</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Weekly summary</TableCell>
                    <TableCell>Queued</TableCell>
                    <TableCell>0m 32s</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SEO scan</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell>2m 08s</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scroll Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40 rounded-lg border">
                <div className="space-y-2 p-3 text-sm">
                  {scrollItems.map((item) => (
                    <div
                      className="flex items-center justify-between"
                      key={item.id}
                    >
                      <span>{item.label}</span>
                      <Badge variant="secondary">Queued</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Carousel</CardTitle>
            </CardHeader>
            <CardContent>
              <Carousel>
                <CarouselContent>
                  {["Reporting", "Automation", "Analytics"].map((label) => (
                    <CarouselItem key={label}>
                      <div className="bg-muted/40 flex h-32 items-center justify-center rounded-lg border text-sm font-medium">
                        {label} panel
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="rich-interactions">
        <DesignSystemSectionHeader
          id="rich-interactions"
          title="Rich Interactions"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Chat Input</CardTitle>
              <CardDescription>
                Chat input with integration selector
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatInput />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Command Palette</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setCommandOpen(true)} variant="outline">
                Open command dialog
              </Button>
              <Command className="h-52">
                <CommandInput placeholder="Search actions..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Workspace">
                    {commandItems.map((item) => (
                      <CommandItem key={item.label}>
                        {item.label}
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Settings">
                    <CommandItem>Profile</CommandItem>
                    <CommandItem>Notifications</CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
              <CommandDialog onOpenChange={setCommandOpen} open={commandOpen}>
                <Command>
                  <CommandInput placeholder="Search commands..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Quick Actions">
                      {commandItems.map((item) => (
                        <CommandItem key={item.label}>
                          {item.label}
                          <CommandShortcut>{item.shortcut}</CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </CommandDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hover Card & Tooltip</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <HoverCard>
                <HoverCardTrigger render={<Button variant="outline" />}>
                  Hover me
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-sm">
                    Hover cards can show rich previews or explanations.
                  </p>
                </HoverCardContent>
              </HoverCard>

              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" />}>
                  Tooltip
                </TooltipTrigger>
                <TooltipContent>Helpful info</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collapsible</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Collapsible
                onOpenChange={setCollapsibleOpen}
                open={collapsibleOpen}
              >
                <CollapsibleTrigger render={<Button variant="outline" />}>
                  {collapsibleOpen ? "Hide" : "Show"} details
                </CollapsibleTrigger>
                <CollapsibleContent className="text-muted-foreground pt-3 text-sm">
                  Collapsible panels are ideal for advanced settings.
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stepper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <ButtonGroup>
                  <Button
                    onClick={() => setStepperValue("details")}
                    variant={stepperValue === "details" ? "default" : "outline"}
                  >
                    Details active
                  </Button>
                  <Button
                    onClick={() => setStepperValue("review")}
                    variant={stepperValue === "review" ? "default" : "outline"}
                  >
                    Review active
                  </Button>
                  <Button
                    onClick={() => setStepperValue("launch")}
                    variant={stepperValue === "launch" ? "default" : "outline"}
                  >
                    Launch active
                  </Button>
                </ButtonGroup>
              </div>
              <Stepper onValueChange={setStepperValue} value={stepperValue}>
                <StepperList>
                  <StepperItem completed={activeStepIndex > 0} value="details">
                    <StepperTrigger className="gap-3">
                      <StepperIndicator />
                      <div className="flex flex-col text-left">
                        <StepperTitle>Details</StepperTitle>
                        <StepperDescription>Basic info</StepperDescription>
                      </div>
                    </StepperTrigger>
                    <StepperSeparator />
                  </StepperItem>
                  <StepperItem completed={activeStepIndex > 1} value="review">
                    <StepperTrigger className="gap-3">
                      <StepperIndicator />
                      <div className="flex flex-col text-left">
                        <StepperTitle>Review</StepperTitle>
                        <StepperDescription>Check changes</StepperDescription>
                      </div>
                    </StepperTrigger>
                    <StepperSeparator />
                  </StepperItem>
                  <StepperItem value="launch">
                    <StepperTrigger className="gap-3">
                      <StepperIndicator />
                      <div className="flex flex-col text-left">
                        <StepperTitle>Launch</StepperTitle>
                        <StepperDescription>Go live</StepperDescription>
                      </div>
                    </StepperTrigger>
                  </StepperItem>
                </StepperList>
                <StepperContent
                  className="text-muted-foreground text-sm"
                  value="details"
                >
                  Provide the main details for the workflow.
                </StepperContent>
                <StepperContent
                  className="text-muted-foreground text-sm"
                  value="review"
                >
                  Confirm all settings before launch.
                </StepperContent>
                <StepperContent
                  className="text-muted-foreground text-sm"
                  value="launch"
                >
                  Ship the automation to production.
                </StepperContent>
                <div className="flex gap-2">
                  <StepperPrev
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Back
                  </StepperPrev>
                  <StepperNext
                    className={buttonVariants({ variant: "default" })}
                  >
                    Next
                  </StepperNext>
                </div>
              </Stepper>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="identity">
        <DesignSystemSectionHeader id="identity" title="Identity & Layout" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Title Card</CardTitle>
            </CardHeader>
            <CardContent>
              <TitleCard
                accentColor="#8B5CF6"
                action={
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                }
                heading="Automation health"
                icon={
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    fill="none"
                    height="24"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Automation</title>
                    <path
                      d="M4 12h4l2-5 4 10 2-5h4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                }
              >
                <p className="text-muted-foreground text-sm">
                  All workflows are running within expected thresholds.
                </p>
              </TitleCard>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Card</CardTitle>
            </CardHeader>
            <CardContent>
              <IntegrationCard
                integration={mockIntegration}
                organizationId="org_123"
                organizationSlug="demo-org"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avatars</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Avatar>
                <AvatarImage src="https://api.dicebear.com/9.x/avataaars/svg?seed=AJ" />
                <AvatarFallback>AJ</AvatarFallback>
                <AvatarBadge />
              </Avatar>
              <Avatar size="lg">
                <AvatarFallback>LG</AvatarFallback>
              </Avatar>
              <AvatarGroup>
                <Avatar>
                  <AvatarImage src="https://api.dicebear.com/9.x/avataaars/svg?seed=SA" />
                  <AvatarFallback>SA</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://api.dicebear.com/9.x/avataaars/svg?seed=KM" />
                  <AvatarFallback>KM</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+3</AvatarGroupCount>
              </AvatarGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sidebar</CardTitle>
            </CardHeader>
            <CardContent>
              <SidebarProvider defaultOpen={true}>
                <div className="overflow-hidden rounded-lg border">
                  <Sidebar collapsible="none">
                    <SidebarHeader>
                      <div className="text-sm font-medium">Notra</div>
                      <SidebarSeparator />
                    </SidebarHeader>
                    <SidebarContent>
                      <SidebarGroup>
                        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            <SidebarMenuItem>
                              <SidebarMenuButton isActive>
                                Overview
                              </SidebarMenuButton>
                              <SidebarMenuBadge>2</SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton>Automations</SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    </SidebarContent>
                  </Sidebar>
                  <SidebarInset className="p-4">
                    <div className="text-muted-foreground text-xs">
                      Sidebar inset content area.
                    </div>
                  </SidebarInset>
                </div>
              </SidebarProvider>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="utility">
        <DesignSystemSectionHeader id="utility" title="Utility Elements" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Separators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="text-sm font-medium">Horizontal</div>
                <Separator />
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium">Vertical</div>
                <Separator orientation="vertical" />
                <div className="text-muted-foreground text-xs">
                  Inline content split
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Toggle & Utility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Live previews</div>
                  <div className="text-muted-foreground text-xs">
                    Toggle UI updates
                  </div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Beta</Badge>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button size="sm" variant="outline" />}
                  >
                    Hover
                  </TooltipTrigger>
                  <TooltipContent>Extra context</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="social">
        <DesignSystemSectionHeader
          description="LinkedIn post preview cards for content planning."
          id="social"
          title="Social Media Previews"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <LinkedInPost
            author={{
              name: "Avery Lane",
              avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Avery",
              headline: "77,350 followers",
            }}
            comments={42}
            content={
              "We just shipped our biggest update yet — and it changes everything about how teams run automations.\n\nAfter months of working closely with power users, we rebuilt the scheduling engine from the ground up. The result? 3x faster execution, smarter retry logic, and a brand-new visual timeline.\n\nHere's what's new:\n• Enum-based lookback windows for precise control\n• Real-time status indicators across all workflows\n• One-click duplication for complex automations\n\nThis is just the beginning. We're building the future of workflow automation, and your feedback is what drives us forward."
            }
            defaultExpanded={false}
            reactions={{ count: 128, types: ["like", "love", "celebrate"] }}
            reposts={12}
            timestamp="2d"
            truncate
          />
          <LinkedInPost
            author={{
              name: "Jordan Kim",
              fallback: "JK",
              headline: "Product Designer at Notra",
            }}
            comments={8}
            content={
              "Excited to share our new dashboard design system — built for consistency, speed, and dark mode from day one.\n\nWe focused on three core principles:\n• Accessibility first — every component tested with screen readers\n• Performance obsessed — zero layout shift, minimal JS\n• Developer experience — copy-paste ready with full TypeScript support\n\nCheck it out and let me know what you think!"
            }
            reactions={{ count: 56, types: ["like", "celebrate"] }}
            reposts={3}
            timestamp="5h"
            truncate
          />
        </div>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="onboarding">
        <DesignSystemSectionHeader
          description="Guided setup checklist for onboarding flows."
          id="onboarding"
          title="Onboarding Checklist"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <OnboardingChecklist onClose={() => toast("Checklist dismissed")}>
            <OnboardingChecklistHeader>
              <OnboardingChecklistTitle>Get started</OnboardingChecklistTitle>
            </OnboardingChecklistHeader>
            <OnboardingChecklistContent
              description="Complete these steps to get the most out of Notra."
              title="Setup your workspace"
            >
              <OnboardingChecklistProgress value={33} />
              <OnboardingChecklistItems>
                <OnboardingChecklistItem completed href="#">
                  Create your first project
                </OnboardingChecklistItem>
                <OnboardingChecklistItem href="#">
                  Invite team members
                </OnboardingChecklistItem>
                <OnboardingChecklistItem href="#">
                  Configure integrations
                </OnboardingChecklistItem>
              </OnboardingChecklistItems>
            </OnboardingChecklistContent>
          </OnboardingChecklist>

          <OnboardingChecklist onClose={() => toast("Checklist dismissed")}>
            <OnboardingChecklistHeader>
              <OnboardingChecklistTitle>Almost there</OnboardingChecklistTitle>
            </OnboardingChecklistHeader>
            <OnboardingChecklistContent
              description="Just one more step to finish setup."
              title="Finalize configuration"
            >
              <OnboardingChecklistProgress value={67} />
              <OnboardingChecklistItems>
                <OnboardingChecklistItem completed href="#">
                  Connect your repository
                </OnboardingChecklistItem>
                <OnboardingChecklistItem completed href="#">
                  Set up notifications
                </OnboardingChecklistItem>
                <OnboardingChecklistItem href="#">
                  Review billing settings
                </OnboardingChecklistItem>
              </OnboardingChecklistItems>
            </OnboardingChecklistContent>
          </OnboardingChecklist>
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="geo-range-picker">
        <DesignSystemSectionHeader
          description="Preset rail plus a two-month calendar range, as used on the GEO pages."
          id="geo-range-picker"
          title="GEO Range Picker"
        />
        <Card>
          <CardHeader>
            <CardTitle>Date range</CardTitle>
            <CardDescription>
              Presets (Today through Year to date) and custom calendar ranges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeoRangePickerDemo />
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="scroll-mt-10 space-y-6" id="braille-loader">
        <DesignSystemSectionHeader
          description="Braille animation for AI thinking state — spells ⠠⠝⠕⠞⠗⠁ (notra)."
          id="braille-loader"
          title="Braille Loader"
        />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="space-y-2 p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Wave
            </p>
            <BrailleLoader className="text-lg" variant="wave" />
          </div>
          <div className="space-y-2 p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Typewriter
            </p>
            <BrailleLoader className="text-lg" variant="typewriter" />
          </div>
          <div className="space-y-2 p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Shimmer
            </p>
            <BrailleLoader className="text-lg" variant="shimmer" />
          </div>
          <div className="space-y-2 p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Pulse
            </p>
            <BrailleLoader className="text-lg" variant="pulse" />
          </div>
        </div>
      </section>

      <Separator />

      <DesignSystemAuthSecurityDemo />

      <DesignSystemWriteDialogDemo />
      <DesignSystemClaudeCatalog />
      <DesignSystemCodexCatalog />
      <DesignSystemOpencodeCatalog />
      <DesignSystemChatgptCatalog />
      <DesignSystemClaudeChatCatalog />
      <DesignSystemGeminiCatalog />
      <DesignSystemPerplexityCatalog />

      <Toaster richColors />
    </DesignSystemFrame>
  );
}
