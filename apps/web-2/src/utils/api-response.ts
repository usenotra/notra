export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
