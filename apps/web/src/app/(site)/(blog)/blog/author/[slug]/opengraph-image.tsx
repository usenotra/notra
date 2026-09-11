import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import type { BlogAuthorPageProps } from "~types/blog";

import { getNotraAuthorBySlug } from "@/utils/authors";
import { OG_BLOG_TITLE_MAX_LENGTH } from "@/utils/constants";
import {
  loadGoogleFont,
  loadImageAsDataUrl,
  splitTitleForDot,
  truncate,
} from "@/utils/og";

export const alt = "Notra blog author";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: BlogAuthorPageProps) {
  const { slug } = await params;
  const author = await getNotraAuthorBySlug(slug);

  const name = truncate(author?.name ?? "Notra", OG_BLOG_TITLE_MAX_LENGTH);
  const { leading, lastWord } = splitTitleForDot(name);
  const role = author?.role ?? null;
  const postCount = author?.postCount ?? 0;
  const postLabel = postCount === 1 ? "post" : "posts";
  const postSummary = `${postCount} ${postLabel}`;

  const eyebrow = "AUTHOR";
  const domain = "usenotra.com";
  const uiText = `${eyebrow} ${domain} ${role ?? ""} ${postSummary}`;

  const [sansFont, sansBoldFont, logoSvg, authorImageDataUrl] =
    await Promise.all([
      loadGoogleFont("Inter", uiText),
      loadGoogleFont("Inter:wght@600", `${uiText} ${name}`),
      Promise.resolve(
        readFileSync(join(process.cwd(), "public/notra-mark.svg"), "utf-8")
      ),
      loadImageAsDataUrl(author?.image ?? null),
    ]);

  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
  const authorImage = authorImageDataUrl ?? logoDataUrl;

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
        {/* biome-ignore lint/performance/noImgElement: next/og JSX requires native img */}
        <img alt="" height={56} src={logoDataUrl} width={56} />
        <div
          style={{
            color: "#525252",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.24em",
          }}
        >
          {eyebrow}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2.5rem",
          marginTop: "3.5rem",
          flex: 1,
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: next/og JSX requires native img */}
        <img
          alt=""
          height={180}
          src={authorImage}
          style={{
            borderRadius: authorImageDataUrl ? "9999px" : 0,
            objectFit: authorImageDataUrl ? "cover" : "contain",
            flexShrink: 0,
          }}
          width={180}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              columnGap: "1rem",
              color: "#1a1a1a",
              fontWeight: 600,
              fontSize: "4rem",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: "36rem",
            }}
          >
            {leading.map((token) => (
              <span key={token.key}>{token.word}</span>
            ))}
            <div style={{ display: "flex" }}>
              <span>{lastWord}</span>
              <span style={{ color: "#7c3aed" }}>.</span>
            </div>
          </div>
          {role ? (
            <div
              style={{
                color: "#525252",
                fontSize: "1.5rem",
                marginTop: "0.75rem",
              }}
            >
              {role}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            color: "#525252",
            fontSize: "1.25rem",
            fontWeight: 600,
          }}
        >
          {postSummary}
        </div>
        <div
          style={{
            color: "#525252",
            fontSize: "1.25rem",
            fontWeight: 600,
          }}
        >
          {domain}
        </div>
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
