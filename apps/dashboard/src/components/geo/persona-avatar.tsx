"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { useMemo } from "react";

import type { PersonaAvatarProps } from "@/types/geo-personas-ui";
import { personaAvatarDataUri, personaInitials } from "@/utils/geo-personas";

export function PersonaAvatar({
  persona,
  size = "default",
  className,
}: PersonaAvatarProps) {
  const src = useMemo(() => personaAvatarDataUri(persona.id), [persona.id]);

  return (
    <Avatar className={className} size={size}>
      <AvatarImage alt="" src={src} />
      <AvatarFallback>{personaInitials(persona.name)}</AvatarFallback>
    </Avatar>
  );
}
