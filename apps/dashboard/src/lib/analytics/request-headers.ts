import { getRequestHeaders as headers } from "@tanstack/react-start/server";

export async function readRequestHeaders(): Promise<Headers | null> {
  try {
    return await headers();
  } catch {
    return null;
  }
}
