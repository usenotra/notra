import type { ReactNode } from "react";
import { Column, Row, Text } from "react-email";

import { EMAIL_THEME } from "../constants/theme";

/**
 * A label/value pair inside an `EmailTitleCard`, separated by a hairline.
 * Two paragraphs in a cell: Outlook ignores `display: block` on inline labels
 * and padding on tables, but honors cell padding and borders.
 */
export const EmailDetailRow = ({
  label,
  first = false,
  children,
}: {
  label: string;
  first?: boolean;
  children: ReactNode;
}) => (
  <Row>
    <Column
      style={{
        borderTop: first ? undefined : `1px solid ${EMAIL_THEME.border}`,
        padding: first ? "2px 0 8px" : "8px 0",
      }}
    >
      <Text
        style={{
          color: EMAIL_THEME.subtleForeground,
          fontSize: "12px",
          lineHeight: "18px",
          margin: 0,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: EMAIL_THEME.foreground,
          fontSize: "14px",
          lineHeight: "22px",
          margin: 0,
          overflowWrap: "anywhere",
        }}
      >
        {children}
      </Text>
    </Column>
  </Row>
);
