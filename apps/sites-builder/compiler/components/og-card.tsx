// oxlint-disable shadcn/no-inline-styles -- satori draws inline styles only; this markup never reaches a browser.
import type { ReactElement } from "react";

import {
  OG_FONT_FAMILY,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  OG_THEME,
} from "../constants/og-images";
import type { OgCardContent } from "../types/og-images";
import { titleSize } from "../utils/og-card";

export function OgCard(content: OgCardContent): ReactElement {
  const colors = OG_THEME[content.appearance];
  return (
    <div
      style={{
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "88px 88px 72px",
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: OG_FONT_FAMILY,
        position: "relative",
      }}
    >
      {content.background ? (
        <img
          alt=""
          height={OG_IMAGE_HEIGHT}
          src={content.background}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            objectFit: "cover",
          }}
          width={OG_IMAGE_WIDTH}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_IMAGE_WIDTH,
          height: 12,
          backgroundColor: content.accent,
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 500,
          color: colors.muted,
        }}
      >
        {content.eyebrow}
      </div>
      <div
        style={{
          display: "block",
          fontSize: titleSize(content.title),
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: "-0.025em",
          lineClamp: 3,
        }}
      >
        {content.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", fontSize: 28 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            marginRight: 16,
            backgroundColor: content.accent,
          }}
        />
        <div style={{ display: "flex", color: colors.muted, fontWeight: 500 }}>
          {content.footer}
        </div>
      </div>
    </div>
  );
}
