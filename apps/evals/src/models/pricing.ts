import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { CACHE_DIR } from "../constants/paths";

const PRICE_LIST_URL = "https://ai-gateway.vercel.sh/v1/models";
const PRICE_CACHE_FILE = join(CACHE_DIR, "gateway-prices.json");
const PRICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** USD per token. */
export interface ModelPrice {
  input: number;
  output: number;
}

interface PriceCache {
  fetchedAt: number;
  prices: Record<string, ModelPrice>;
}

interface GatewayModelEntry {
  id: string;
  pricing?: { input?: string; output?: string };
}

let pricesPromise: Promise<Record<string, ModelPrice>> | undefined;

async function readCache(): Promise<PriceCache | undefined> {
  try {
    return JSON.parse(await readFile(PRICE_CACHE_FILE, "utf8")) as PriceCache;
  } catch {
    return undefined;
  }
}

async function loadPrices(): Promise<Record<string, ModelPrice>> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.prices;
  }
  try {
    const response = await fetch(PRICE_LIST_URL, {
      signal: AbortSignal.timeout(5000),
    });
    const body = (await response.json()) as { data?: GatewayModelEntry[] };
    const prices: Record<string, ModelPrice> = {};
    for (const entry of body.data ?? []) {
      const input = Number(entry.pricing?.input);
      const output = Number(entry.pricing?.output);
      if (Number.isFinite(input) && Number.isFinite(output)) {
        prices[entry.id] = { input, output };
      }
    }
    await mkdir(dirname(PRICE_CACHE_FILE), { recursive: true });
    await writeFile(
      PRICE_CACHE_FILE,
      JSON.stringify({ fetchedAt: Date.now(), prices } satisfies PriceCache)
    );
    return prices;
  } catch {
    return cached?.prices ?? {};
  }
}

export async function priceFor(
  modelId: string
): Promise<ModelPrice | undefined> {
  pricesPromise ??= loadPrices();
  const prices = await pricesPromise;
  return prices[modelId];
}

/** Whole gateway price list (cached for a day). */
export function allPrices(): Promise<Record<string, ModelPrice>> {
  pricesPromise ??= loadPrices();
  return pricesPromise;
}
