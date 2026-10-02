import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";
import type { OgContributor } from "~types/github";

import logoSvg from "@/../public/notra-mark.svg?raw";
import {
  OG_EXCLUDED_CONTRIBUTOR,
  OG_MAX_CONTRIBUTORS,
  OG_MAX_LOGIN_LENGTH,
} from "@/utils/constants";
import { fetchContributorsData } from "@/utils/github";
import { loadInterFont, truncate } from "@/utils/og";

const size = { width: 1200, height: 630 };

async function GET() {
  const data = await fetchContributorsData();
  const contributors: OgContributor[] = data.contributors
    .filter((c) => c.login !== OG_EXCLUDED_CONTRIBUTOR)
    .slice(0, OG_MAX_CONTRIBUTORS)
    .map((c) => ({
      ...c,
      displayLogin: truncate(c.login, OG_MAX_LOGIN_LENGTH),
    }));

  const [sansFont, sansBoldFont] = await Promise.all([
    loadInterFont(400),
    loadInterFont(600),
  ]);

  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        padding: "5rem",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <img alt="" height={56} src={logoDataUrl} width={56} />
        <div
          style={{
            color: "#525252",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.24em",
          }}
        >
          CONTRIBUTORS
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "3.5rem",
        }}
      >
        <div
          style={{
            color: "#1a1a1a",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "5rem",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          Built by the
        </div>
        <div
          style={{
            display: "flex",
            color: "#1a1a1a",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "5rem",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          <span>community</span>
          <span style={{ color: "#7c3aed" }}>.</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: "auto",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {contributors.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "9.5rem",
            }}
          >
            <img
              alt=""
              height={96}
              src={c.avatar_url}
              style={{
                borderRadius: "9999px",
              }}
              width={96}
            />
            <div
              style={{
                color: "#1a1a1a",
                fontSize: "1.25rem",
                fontWeight: 600,
                marginTop: "1rem",
              }}
            >
              {c.displayLogin}
            </div>
            <div
              style={{
                color: "#525252",
                fontSize: "1rem",
                marginTop: "0.125rem",
              }}
            >
              {`${c.contributions} ${c.contributions === 1 ? "commit" : "commits"}`}
            </div>
          </div>
        ))}
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

export const Route = createFileRoute("/_site/contributors/opengraph-image")({
  server: { handlers: { GET } },
});
