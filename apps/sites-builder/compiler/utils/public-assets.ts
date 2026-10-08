import { SRCSET_ATTRIBUTE, URL_ATTRIBUTE } from "../constants/public-assets";

export function rewritePublicAssetUrls(
  html: string,
  mount: string,
  publicFiles: ReadonlySet<string>
): string {
  if (mount === "/" || publicFiles.size === 0) {
    return html;
  }
  const rewrite = (url: string) => {
    const match = /^([^?#]*)(.*)$/.exec(url);
    const path = match?.[1] ?? url;
    let decoded = path;
    try {
      decoded = decodeURI(path);
    } catch {
      decoded = path;
    }
    return publicFiles.has(decoded)
      ? `${mount}${path}${match?.[2] ?? ""}`
      : url;
  };
  return html
    .replace(
      URL_ATTRIBUTE,
      (whole, name: string, quote: string, url: string) =>
        url.startsWith("//") ? whole : `${name}=${quote}${rewrite(url)}${quote}`
    )
    .replace(SRCSET_ATTRIBUTE, (_whole, quote: string, value: string) => {
      const rewritten = value
        .split(",")
        .map((candidate) => {
          const [url = "", ...descriptor] = candidate.trim().split(/\s+/);
          return [
            url.startsWith("/") && !url.startsWith("//") ? rewrite(url) : url,
            ...descriptor,
          ].join(" ");
        })
        .join(", ");
      return `srcset=${quote}${rewritten}${quote}`;
    });
}
