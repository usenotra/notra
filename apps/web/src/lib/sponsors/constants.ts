import { Neon } from "@notra/ui/components/ui/svgs/neon";
import { Upstash } from "@notra/ui/components/ui/svgs/upstash";
import { Vercel } from "@notra/ui/components/ui/svgs/vercel";
import type { Sponsor } from "~types/sponsors";

export const SPONSORS: Sponsor[] = [
  {
    name: "Upstash",
    url: "https://upstash.com",
    logo: Upstash,
  },
  {
    name: "Neon",
    url: "https://neon.com",
    logo: Neon,
  },
  {
    name: "Vercel",
    url: "https://vercel.com",
    logo: Vercel,
  },
];
