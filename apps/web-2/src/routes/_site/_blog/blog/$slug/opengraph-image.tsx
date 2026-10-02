import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";

import ditherDataUrl from "@/../public/blog/og-dither.png?inline";
import logoSvg from "@/../public/notra-mark.svg?raw";
import { getNotraBlogPostBySlug } from "@/utils/blog";
import { OG_BLOG_TITLE_MAX_LENGTH } from "@/utils/constants";
import { loadGoogleFont, loadImageAsDataUrl, truncate } from "@/utils/og";

const size = { width: 1200, height: 630 };

async function GET({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const post = await getNotraBlogPostBySlug(slug);

  const title = truncate(post?.title ?? "Notra Blog", OG_BLOG_TITLE_MAX_LENGTH);
  const author = post?.authors[0] ?? null;

  const eyebrow = "BLOG";
  const domain = "usenotra.com";
  const uiText = `${eyebrow} ${domain} ${author?.name ?? ""} ${author?.role ?? ""}`;

  const [sansFont, sansBoldFont, authorImageDataUrl] = await Promise.all([
    loadGoogleFont("Inter", uiText),
    loadGoogleFont("Inter:wght@600", `${uiText} ${title}`),
    loadImageAsDataUrl(author?.image ?? null),
  ]);

  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
  const authorImage = authorImageDataUrl ?? logoDataUrl;

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
          {eyebrow}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "3.5rem",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#1a1a1a",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "4rem",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "44rem",
          }}
        >
          {title}
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
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <img
            alt=""
            height={64}
            src={authorImage}
            style={{ borderRadius: "9999px" }}
            width={64}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                color: "#1a1a1a",
                fontSize: "1.5rem",
                fontWeight: 600,
              }}
            >
              {author?.name ?? "Notra"}
            </div>
            {author?.role ? (
              <div
                style={{
                  color: "#525252",
                  fontSize: "1.125rem",
                  marginTop: "0.125rem",
                }}
              >
                {author.role}
              </div>
            ) : null}
          </div>
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

export const Route = createFileRoute("/_site/_blog/blog/$slug/opengraph-image")(
  {
    server: { handlers: { GET } },
  }
);
