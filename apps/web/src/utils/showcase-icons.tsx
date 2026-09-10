import { BetterAuthLight } from "@notra/ui/components/ui/svgs/betterAuthLight";
import { Cal } from "@notra/ui/components/ui/svgs/cal";
import { Databuddy } from "@notra/ui/components/ui/svgs/databuddy";
import { Langfuse } from "@notra/ui/components/ui/svgs/langfuse";
import { Neon } from "@notra/ui/components/ui/svgs/neon";
import Image from "next/image";
import type { ReactNode } from "react";

export const SHOWCASE_COMPANY_ICONS: Record<string, ReactNode> = {
  "better-auth": <BetterAuthLight className="size-5" />,
  "cal-com": <Cal className="size-5" />,
  databuddy: <Databuddy className="size-5 rounded" />,
  langfuse: <Langfuse className="size-5" />,
  autumn: (
    <Image
      alt="Autumn"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/autumn.avif"
      width={53}
    />
  ),
  neon: <Neon className="size-5 rounded" />,
  openclaw: (
    <Image
      alt="OpenClaw"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/openclaw.webp"
      width={53}
    />
  ),
  unkey: (
    <Image
      alt="Unkey"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/unkey.webp"
      width={53}
    />
  ),
  pangolin: (
    <Image
      alt="Pangolin"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/pangolin.webp"
      width={85}
    />
  ),
  onyx: (
    <Image
      alt="Onyx"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/onyx.webp"
      width={85}
    />
  ),
  "nao-labs": (
    <Image
      alt="nao Labs"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/nao-labs.webp"
      width={85}
    />
  ),
  superagent: (
    <Image
      alt="Superagent"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/superagent.webp"
      width={85}
    />
  ),
  emdash: (
    <Image
      alt="Emdash"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/emdash.webp"
      width={85}
    />
  ),
  "unsloth-ai": (
    <Image
      alt="Unsloth AI"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/unsloth-ai.webp"
      width={85}
    />
  ),
  corsair: (
    <Image
      alt="Corsair"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/corsair.webp"
      width={85}
    />
  ),
  "confident-ai": (
    <Image
      alt="Confident AI"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/confident-ai.webp"
      width={85}
    />
  ),
  char: (
    <Image
      alt="Char"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/char.webp"
      width={85}
    />
  ),
  airweave: (
    <Image
      alt="Airweave"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/airweave.webp"
      width={85}
    />
  ),
  "assistant-ui": (
    <Image
      alt="assistant-ui"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/assistant-ui.svg"
      width={85}
    />
  ),
  cmux: (
    <Image
      alt="cmux"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/cmux.webp"
      width={85}
    />
  ),
  sim: (
    <Image
      alt="Sim"
      className="h-5 w-auto rounded"
      height={85}
      src="/logos/brands/sim.webp"
      width={85}
    />
  ),
};
