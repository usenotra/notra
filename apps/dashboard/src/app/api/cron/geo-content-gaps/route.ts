import { refreshDueGeoContentGaps } from "@/lib/geo/content-gaps-refresh";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await refreshDueGeoContentGaps();
  return Response.json(result, { status: result.failed > 0 ? 500 : 200 });
}
