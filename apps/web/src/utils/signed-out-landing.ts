export function buildSignedOutLandingHref(searchStr: string, hash: string) {
  const search = new URLSearchParams(searchStr);
  search.delete("mode");
  const query = search.toString();
  return `/${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
