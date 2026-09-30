/** Realtime channel carrying one demo sandbox's request feed. */
export function demoRequestChannel(organizationId: string): string {
  return `demo:${organizationId}`;
}
