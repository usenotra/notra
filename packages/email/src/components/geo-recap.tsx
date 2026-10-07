import { Column, Img, Link, Row, Section, Text } from "react-email";

import { EMAIL_THEME } from "../constants/theme";
import type {
  GeoRecapAction,
  GeoRecapCompetitor,
  GeoRecapItem,
  GeoRecapTone,
} from "../types/geo-recap";

const PILL: Record<GeoRecapTone, { backgroundColor: string; color: string }> = {
  up: {
    backgroundColor: EMAIL_THEME.geoUpWash,
    color: EMAIL_THEME.geoUpText,
  },
  down: {
    backgroundColor: EMAIL_THEME.geoDownWash,
    color: EMAIL_THEME.geoDownText,
  },
  neutral: {
    backgroundColor: EMAIL_THEME.muted,
    color: EMAIL_THEME.subtleForeground,
  },
};

export function toneFromDelta(label: string): GeoRecapTone {
  if (label.startsWith("+")) {
    return "up";
  }
  if (label.startsWith("-") || label.startsWith("−")) {
    return "down";
  }
  return "neutral";
}

function toneMark(tone: GeoRecapTone): string {
  if (tone === "up") {
    return "+";
  }
  if (tone === "down") {
    return "−";
  }
  return "0";
}

const subtleText = {
  color: EMAIL_THEME.subtleForeground,
  fontSize: "12px",
  margin: 0,
} as const;

export function GeoMetricCell({
  label,
  last = false,
  pill,
  tone = "neutral",
  value,
}: {
  label: string;
  last?: boolean;
  pill?: string;
  tone?: GeoRecapTone;
  value: string;
}) {
  return (
    <Column
      style={{
        borderRight: last ? undefined : `1px solid ${EMAIL_THEME.border}`,
        paddingRight: last ? undefined : "12px",
        paddingLeft: last ? "12px" : undefined,
        verticalAlign: "top",
        width: "50%",
      }}
    >
      <Text style={subtleText}>{label}</Text>
      <Text
        style={{
          color: EMAIL_THEME.foreground,
          fontSize: "22px",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
          margin: "4px 0 0",
        }}
      >
        {value}
        {pill ? (
          <>
            {" "}
            <GeoPill tone={tone}>{pill}</GeoPill>
          </>
        ) : null}
      </Text>
    </Column>
  );
}

export function GeoChangeList({
  items,
  remainingCount,
}: {
  items: readonly GeoRecapItem[];
  remainingCount: number;
}) {
  return (
    <>
      {items.map((item, index) => (
        <GeoChangeRow
          first={index === 0}
          item={item}
          key={item.id}
          last={index === items.length - 1}
        />
      ))}
      {remainingCount > 0 ? (
        <Text
          style={{
            ...subtleText,
            fontSize: "13px",
            margin: "12px 0 0",
            textAlign: "center",
          }}
        >
          And {remainingCount} more in Notra
        </Text>
      ) : null}
    </>
  );
}

function GeoChangeRow({
  first,
  item,
  last,
}: {
  first: boolean;
  item: GeoRecapItem;
  last: boolean;
}) {
  const inline = {
    color: EMAIL_THEME.subtleForeground,
    display: "inline-block",
    fontSize: "12px",
    verticalAlign: "middle",
  } as const;

  return (
    <Section
      style={{
        borderBottom: last ? undefined : `1px solid ${EMAIL_THEME.border}`,
        paddingBottom: last ? 0 : "12px",
        paddingTop: first ? 0 : "12px",
      }}
    >
      <Text
        style={{
          color: EMAIL_THEME.foreground,
          fontSize: "14px",
          fontWeight: 500,
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {item.title}
      </Text>
      <Row>
        <Column style={{ paddingTop: "6px" }}>
          {/* Spacing via text: Outlook ignores margins on inline elements. */}
          {item.changes.map((change) => (
            <span key={change.id} style={inline}>
              <GeoToneMark tone={change.tone} />
              {` ${change.detail}   `}
            </span>
          ))}
          {item.engineLabel ? (
            <span style={inline}>
              {item.engineIconSrc ? (
                <Img
                  alt=""
                  height="14"
                  src={item.engineIconSrc}
                  style={{
                    display: "inline-block",
                    margin: "0 4px 0 0",
                    verticalAlign: "middle",
                  }}
                  width="14"
                />
              ) : null}
              {item.engineLabel}
            </span>
          ) : null}
        </Column>
      </Row>
    </Section>
  );
}

export function GeoCompetitorTable({
  competitors,
}: {
  competitors: readonly GeoRecapCompetitor[];
}) {
  return (
    <>
      {competitors.map((competitor, index) => {
        const tone = toneFromDelta(competitor.deltaLabel);
        const last = index === competitors.length - 1;
        return (
          <Row
            key={competitor.name}
            style={{
              borderBottom: last
                ? undefined
                : `1px solid ${EMAIL_THEME.border}`,
            }}
          >
            <Column
              style={{
                padding: `${index === 0 ? 0 : "8px"} 0 ${last ? 0 : "8px"}`,
              }}
            >
              <Text
                style={{
                  color: EMAIL_THEME.foreground,
                  fontSize: "14px",
                  fontWeight: competitor.isOwnBrand ? 600 : 400,
                  margin: 0,
                }}
              >
                {competitor.name}
                {competitor.isOwnBrand ? (
                  <span style={{ color: EMAIL_THEME.subtleForeground }}>
                    {" "}
                    (you)
                  </span>
                ) : null}
              </Text>
            </Column>
            <Column
              align="right"
              style={{
                padding: `${index === 0 ? 0 : "8px"} 0 ${last ? 0 : "8px"}`,
                whiteSpace: "nowrap",
              }}
            >
              <Text
                style={{
                  color: EMAIL_THEME.foreground,
                  fontSize: "14px",
                  fontVariantNumeric: "tabular-nums",
                  margin: 0,
                }}
              >
                {competitor.shareLabel}{" "}
                <GeoPill tone={tone}>{competitor.deltaLabel}</GeoPill>
              </Text>
            </Column>
          </Row>
        );
      })}
    </>
  );
}

export function GeoActionCard({ action }: { action: GeoRecapAction }) {
  return (
    <Section
      style={{
        border: `1px solid ${EMAIL_THEME.border}`,
        borderRadius: EMAIL_THEME.radius,
        padding: "14px 16px",
      }}
    >
      <Text style={subtleText}>{action.eyebrow}</Text>
      <Text
        style={{
          color: EMAIL_THEME.foreground,
          fontSize: "15px",
          fontWeight: 500,
          lineHeight: 1.4,
          margin: "4px 0 0",
        }}
      >
        {action.title}
      </Text>
      <Text
        style={{
          color: EMAIL_THEME.subtleForeground,
          fontSize: "13px",
          lineHeight: 1.5,
          margin: "4px 0 0",
        }}
      >
        {action.body}
      </Text>
      <Text style={{ fontSize: "13px", margin: "10px 0 0" }}>
        <Link
          href={action.href}
          style={{
            color: EMAIL_THEME.foreground,
            fontWeight: 500,
            textDecoration: "underline",
          }}
        >
          {action.label} →
        </Link>
      </Text>
    </Section>
  );
}

function GeoToneMark({ tone }: { tone: GeoRecapTone }) {
  const colors = PILL[tone];

  // Plain glyphs: Outlook drops background-image, so no drawn minus bar.
  return (
    <span
      style={{
        backgroundColor: colors.backgroundColor,
        borderRadius: "9999px",
        color: colors.color,
        display: "inline-block",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        fontWeight: 600,
        height: "16px",
        lineHeight: "16px",
        textAlign: "center",
        verticalAlign: "middle",
        width: "16px",
      }}
    >
      {toneMark(tone)}
    </span>
  );
}

export function GeoPill({
  children,
  tone,
}: {
  children: string;
  tone: GeoRecapTone;
}) {
  return (
    <span
      style={{
        ...PILL[tone],
        borderRadius: "9999px",
        display: "inline-block",
        fontSize: "11px",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 500,
        lineHeight: "16px",
        padding: "2px 6px",
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}
