"use client";

import {
  ArrowDown01Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import { BreadcrumbPage } from "@notra/ui/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useSyncExternalStore } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { getBrandFaviconUrl } from "@/utils/brand";
import {
  brandIdentityViewParser,
  brandIdentityVoiceParser,
} from "@/utils/brand-identity-search-params";
import {
  findSelectedBrandIdentity,
  readStoredBrandIdentityId,
  writeStoredBrandIdentityId,
} from "@/utils/brand-identity-selection";

const storedBrandIdentityListeners = new Set<() => void>();

function subscribeToStoredBrandIdentity(onStoreChange: () => void) {
  storedBrandIdentityListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    storedBrandIdentityListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function notifyStoredBrandIdentityChange() {
  for (const listener of storedBrandIdentityListeners) {
    listener();
  }
}

function getServerStoredBrandIdentityId(): string | null {
  return null;
}

function BrandIdentityAvatar({
  name,
  websiteUrl,
}: {
  name: string;
  websiteUrl: string | null;
}) {
  return (
    <Avatar className="size-4 after:rounded-full" size="sm">
      <AvatarImage src={getBrandFaviconUrl(websiteUrl)} />
      <AvatarFallback className="text-[9px]">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function BrandTopbarIdentitySelector({ slug }: { slug: string }) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const router = useRouter();
  const [{ voice: voiceParam, view }] = useQueryStates({
    voice: brandIdentityVoiceParser,
    view: brandIdentityViewParser,
  });

  const { data } = useBrandSettings(organizationId);
  const voices = data?.voices ?? [];
  const isReferencesView = view === "references";
  const storedVoiceId = useSyncExternalStore(
    subscribeToStoredBrandIdentity,
    () => (organizationId ? readStoredBrandIdentityId(organizationId) : null),
    getServerStoredBrandIdentityId
  );

  const activeVoice = findSelectedBrandIdentity(
    voices,
    voiceParam,
    storedVoiceId
  );

  const brandBasePath = `/${slug}/brand/identity`;
  const viewSuffix = isReferencesView ? "&view=references" : "";

  function handleSelectVoice(voiceId: string) {
    writeStoredBrandIdentityId(organizationId, voiceId);
    notifyStoredBrandIdentityChange();
    router.replace(`${brandBasePath}?voice=${voiceId}${viewSuffix}`);
  }

  if (voices.length === 0 || !activeVoice) {
    return (
      <BreadcrumbPage className="block min-w-0 truncate">
        Company Info
      </BreadcrumbPage>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="text-foreground hover:bg-accent data-popup-open:bg-accent -mx-1.5 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-normal transition-colors outline-none"
            type="button"
          >
            <BrandIdentityAvatar
              name={activeVoice.name}
              websiteUrl={activeVoice.websiteUrl}
            />
            <span className="truncate">{activeVoice.name}</span>
            <HugeiconsIcon
              className="text-muted-foreground size-3.5 shrink-0"
              icon={ArrowDown01Icon}
            />
          </button>
        }
      />
      <DropdownMenuContent
        align="start"
        className="min-w-52 rounded-lg"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Brand identities</DropdownMenuLabel>
          {voices.map((voice) => (
            <DropdownMenuItem
              className="cursor-pointer gap-2 pr-8"
              key={voice.id}
              onClick={() => handleSelectVoice(voice.id)}
            >
              <BrandIdentityAvatar
                name={voice.name}
                websiteUrl={voice.websiteUrl}
              />
              <span className="min-w-0 flex-1 truncate">{voice.name}</span>
              {voice.isDefault ? (
                <Badge
                  className="shrink-0 px-1.5 py-0 text-[10px] font-medium"
                  variant="secondary"
                >
                  Default
                </Badge>
              ) : null}
              {activeVoice.id === voice.id ? (
                <HugeiconsIcon
                  className="text-muted-foreground absolute right-2 size-4"
                  icon={Tick02Icon}
                />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => router.push(`${brandBasePath}?new=1`)}
        >
          <HugeiconsIcon icon={PlusSignIcon} />
          Create identity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
