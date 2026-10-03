import {
  GEO_LIVE_CHANNEL_PREFIX,
  GEO_LIVE_WATCH_KEY_PREFIX,
} from "../constants/geo";

export function geoLiveChannel(organizationId: string): string {
  return `${GEO_LIVE_CHANNEL_PREFIX}:${organizationId}`;
}

export function geoLiveProgressKey(projectId: string): string {
  return `${GEO_LIVE_CHANNEL_PREFIX}:live:progress:${projectId}`;
}

export function geoLiveWatchKey(organizationId: string): string {
  return `${GEO_LIVE_WATCH_KEY_PREFIX}:${organizationId}`;
}

/** Organizations whose `geo:{orgId}` channel a client asked for. */
export function geoLiveChannelOrganizations(
  channels: readonly string[]
): string[] {
  const prefix = `${GEO_LIVE_CHANNEL_PREFIX}:`;
  return channels
    .filter((channel) => channel.startsWith(prefix))
    .map((channel) => channel.slice(prefix.length));
}
