import { Link, Section } from "react-email";

import { EmailDetailRow } from "../components/detail-row";
import { EmailLayout } from "../components/layout";
import { EmailMessageCard } from "../components/message-card";
import { EmailTitleCard } from "../components/title-card";
import { EMAIL_THEME } from "../constants/theme";
import type { ContactMessageEmailProps } from "../types/contact";
import { toPreviewText } from "../utils/preview";

export const ContactMessageEmail = ({
  name = "Jane Doe",
  email = "jane@example.com",
  company,
  message = "We're evaluating Notra for our team and would love to chat about volume pricing.",
}: ContactMessageEmailProps) => {
  return (
    <EmailLayout heading="New contact message" preview={toPreviewText(message)}>
      <EmailMessageCard message={message} />

      <Section className="mt-4">
        <EmailTitleCard heading="Details">
          <EmailDetailRow first label="From">
            {name} &lt;
            <Link
              href={`mailto:${email}`}
              style={{ color: EMAIL_THEME.link, textDecoration: "underline" }}
            >
              {email}
            </Link>
            &gt;
          </EmailDetailRow>
          {company ? (
            <EmailDetailRow label="Company">{company}</EmailDetailRow>
          ) : null}
        </EmailTitleCard>
      </Section>
    </EmailLayout>
  );
};

export default ContactMessageEmail;
