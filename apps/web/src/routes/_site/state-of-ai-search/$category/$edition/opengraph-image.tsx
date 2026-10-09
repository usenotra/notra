import { googleFaviconUrl } from "@notra/utils/google-favicon";
import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";

import ditherDataUrl from "@/../public/blog/og-dither.png?inline";
import logoSvg from "@/../public/notra-mark.svg?raw";
import { STATE_OF_AI_SEARCH_TITLE } from "@/constants/state-of-ai-search";
import { findSummary } from "@/lib/state-of-ai-search/reports";
import { loadImageAsDataUrl, loadInterFont } from "@/utils/og";

const size = { width: 1200, height: 630 };
const OG_LEADERS = 3;
const BAR_WIDTH = 420;
const PERCENT_MAX = 100;

async function GET({
  params,
}: {
  params: { category: string; edition: string };
}) {
  const report = findSummary(params.category, params.edition);
  const leaders = report?.leaders.slice(0, OG_LEADERS) ?? [];
  const [sansFont, sansBoldFont, ...logos] = await Promise.all([
    loadInterFont(400),
    loadInterFont(600),
    ...leaders.map((row) => loadImageAsDataUrl(googleFaviconUrl(row.domain))),
  ]);
  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        padding: "4.5rem 5rem",
        fontFamily: "Inter",
      }}
    >
      <img
        alt=""
        height={315}
        src={ditherDataUrl}
        style={{ position: "absolute", bottom: 0, left: 0 }}
        width={size.width}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "#525252",
          fontSize: 26,
          fontWeight: 600,
        }}
      >
        <img alt="" height={40} src={logoDataUrl} width={40} />
        {`${STATE_OF_AI_SEARCH_TITLE} · ${report?.editionLabel ?? ""}`}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "2.25rem",
          color: "#1a1a1a",
          fontSize: "4.25rem",
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {`Who wins ${report?.subject ?? "AI search"} in AI search`}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: "2.75rem",
        }}
      >
        {leaders.map((row, index) => (
          <div
            key={row.name}
            style={{ display: "flex", alignItems: "center", gap: 18 }}
          >
            <div
              style={{
                display: "flex",
                width: 28,
                color: "#737373",
                fontSize: 26,
              }}
            >
              {String(row.rank)}
            </div>
            {logos[index] ? (
              <img
                alt=""
                height={40}
                src={logos[index]}
                style={{ borderRadius: 8 }}
                width={40}
              />
            ) : (
              <div style={{ display: "flex", width: 40, height: 40 }} />
            )}
            <div
              style={{
                display: "flex",
                width: 330,
                color: "#1a1a1a",
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {row.name}
            </div>
            <div
              style={{
                display: "flex",
                width: BAR_WIDTH,
                height: 14,
                borderRadius: 999,
                backgroundColor: "#F1F1F4",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: (BAR_WIDTH * row.visibility) / PERCENT_MAX,
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: "#8B5CF6",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                color: "#1a1a1a",
                fontSize: 30,
                fontWeight: 600,
              }}
            >
              {`${row.visibility}%`}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "5rem",
          top: "4.75rem",
          color: "#525252",
          fontSize: "1.25rem",
          fontWeight: 600,
        }}
      >
        usenotra.com
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: sansFont, style: "normal", weight: 400 },
        { name: "Inter", data: sansBoldFont, style: "normal", weight: 600 },
      ],
    }
  );
}

export const Route = createFileRoute(
  "/_site/state-of-ai-search/$category/$edition/opengraph-image"
)({
  server: { handlers: { GET } },
});
