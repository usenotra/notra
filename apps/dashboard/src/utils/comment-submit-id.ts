export function commentSubmitId(
  retry: { id: string; body: string; parentId: string | null } | null,
  body: string,
  parentId: string | null
) {
  return retry?.body === body && retry.parentId === parentId
    ? retry.id
    : crypto.randomUUID();
}
