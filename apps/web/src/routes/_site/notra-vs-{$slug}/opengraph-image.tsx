import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";

import ditherDataUrl from "@/../public/blog/og-dither.png?inline";
import logoSvg from "@/../public/notra-mark.svg?raw";
import { COMPARE_VERIFIED_LABEL } from "@/constants/compare/page";
import { findCompareCompetitor, getCompareTitle } from "@/utils/compare";
import { loadInterFont } from "@/utils/og";

const size = { width: 1200, height: 630 };

const COMPETITOR_LOGOS = import.meta.glob<string>(
  "/public/logos/competitors/*.{svg,png}",
  { query: "?inline", import: "default" }
);

const TILE_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 144,
  height: 144,
  borderRadius: 32,
  backgroundColor: "#ffffff",
  border: "2px solid #E4E4E7",
  padding: 28,
} as const;

async function GET({ params }: { params: { slug: string } }) {
  const competitor = findCompareCompetitor(params.slug);
  const title = competitor ? getCompareTitle(competitor) : "Notra vs the rest";
  const loadCompetitorLogo = competitor
    ? COMPETITOR_LOGOS[`/public${competitor.logo.src}`]
    : undefined;

  const [sansFont, sansBoldFont, competitorLogo] = await Promise.all([
    loadInterFont(400),
    loadInterFont(600),
    loadCompetitorLogo ? loadCompetitorLogo() : Promise.resolve(null),
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
        padding: "5rem",
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
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div style={TILE_STYLE}>
          <img alt="" height={88} src={logoDataUrl} width={88} />
        </div>
        <div style={{ color: "#737373", fontSize: 40, fontWeight: 600 }}>
          vs
        </div>
        {competitorLogo ? (
          <div style={TILE_STYLE}>
            <img
              alt=""
              height={88}
              src={competitorLogo}
              style={{ objectFit: "contain" }}
              width={88}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "3rem",
          color: "#1a1a1a",
          fontSize: "4.5rem",
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "1.25rem",
          color: "#525252",
          fontSize: "1.75rem",
        }}
      >
        {`Honest comparison, checked ${COMPARE_VERIFIED_LABEL}`}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "5rem",
          top: "5rem",
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

export const Route = createFileRoute("/_site/notra-vs-{$slug}/opengraph-image")(
  {
    server: { handlers: { GET } },
  }
);
