import type { z } from "zod";

import type { contactMessageSchema } from "@/schemas/contact";

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export type ContactResourceIconId = "documentation" | "mcp" | "oss" | "pricing";

export interface ContactResourceLink {
  href: string;
  label: string;
  description: string;
  icon: ContactResourceIconId;
  external: boolean;
}
