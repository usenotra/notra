import { realtime } from "@notra/ai/realtime";
import { markGeoLiveWatched } from "@notra/geo-core/geo/live";
import { geoLiveChannelOrganizations } from "@notra/geo-core/utils/geo-live";
import { handle } from "@upstash/realtime";

import { getServerSession } from "@/lib/auth/session";
import { authorizeRealtimeChannels } from "@/lib/realtime/channel-acl";

const handler = realtime
  ? handle({
      realtime,
      middleware: async ({ request, channels }) => {
        const { session, user } = await getServerSession({
          headers: request.headers,
        });

        if (!(session && user)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const denied = await authorizeRealtimeChannels({
          headers: request.headers,
          channels,
          user,
        });
        if (!denied) {
          // Ingest only publishes traffic updates while someone watches.
          await markGeoLiveWatched(geoLiveChannelOrganizations(channels));
        }
        return denied;
      },
    })
  : null;

export async function GET(request: Request) {
  if (!handler) {
    return new Response(JSON.stringify({ error: "Realtime not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  return handler(request);
}
