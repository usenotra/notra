import type { SitemapEntry } from "@/types/sitemap";

export function renderSitemapXml(entries: SitemapEntry[]): string {
  let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
  content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    content += "<url>\n";
    content += `<loc>${entry.url}</loc>\n`;
    if (entry.lastModified) {
      const lastModified =
        entry.lastModified instanceof Date
          ? entry.lastModified.toISOString()
          : entry.lastModified;
      content += `<lastmod>${lastModified}</lastmod>\n`;
    }
    if (entry.changeFrequency) {
      content += `<changefreq>${entry.changeFrequency}</changefreq>\n`;
    }
    if (typeof entry.priority === "number") {
      content += `<priority>${entry.priority}</priority>\n`;
    }
    content += "</url>\n";
  }

  content += "</urlset>\n";
  return content;
}
