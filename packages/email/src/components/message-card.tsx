import { Text } from "react-email";

import { EMAIL_THEME } from "../constants/theme";
import { EmailTitleCard } from "./title-card";

/** Free text someone wrote to us, kept as typed (line breaks included). */
export const EmailMessageCard = ({ message }: { message: string }) => (
  <EmailTitleCard heading="Message">
    <Text
      style={{
        color: EMAIL_THEME.foreground,
        fontSize: "15px",
        lineHeight: "22px",
        margin: 0,
        whiteSpace: "pre-wrap",
      }}
    >
      {message}
    </Text>
  </EmailTitleCard>
);
