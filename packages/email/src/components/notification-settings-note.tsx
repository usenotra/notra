import { Link, Section, Text } from "react-email";

import { EMAIL_THEME } from "../constants/theme";
import { EMAIL_CONFIG } from "../utils/config";

export const EmailNotificationSettingsNote = ({
  organizationName,
  organizationSlug,
}: {
  organizationName: string;
  organizationSlug: string;
}) => (
  <Section className="mt-8">
    <Text
      className="m-0 text-center text-[13px] leading-[20px]"
      style={{ color: EMAIL_THEME.subtleForeground }}
    >
      You get this because email notifications are on for {organizationName}.{" "}
      <Link
        href={`${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/settings/notifications`}
        style={{
          color: EMAIL_THEME.subtleForeground,
          textDecoration: "underline",
        }}
      >
        Manage email notifications
      </Link>
    </Text>
  </Section>
);
