import { Link, Text } from "react-email";

import { EmailLayout } from "../components/layout";
import { EMAIL_THEME } from "../constants/theme";

const PARAGRAPH = "mt-0 mb-4 text-[15px] leading-[24px] text-[#171717]";
const LINK_STYLE = { color: EMAIL_THEME.link, textDecoration: "underline" };

export const WelcomeEmail = () => {
  return (
    <EmailLayout
      heading="Welcome to Notra"
      preview="A quick note from Dominik, the founder of Notra"
    >
      <Text className={PARAGRAPH}>
        Hey, I'm Dominik, the founder of Notra. I wanted to personally welcome
        you and say thanks for signing up.
      </Text>

      <Text className={PARAGRAPH}>
        We built Notra because we were shipping faster than ever but didn't have
        enough time to come up with tweets, changelogs and LinkedIn posts.
      </Text>

      <Text className={PARAGRAPH}>
        If you have any questions, feedback, or just want to chat, reply to this
        email. We read every single one.
      </Text>

      <Text className={PARAGRAPH}>
        You can also{" "}
        <Link href="https://usenotra.com/founder-chat" style={LINK_STYLE}>
          book a chat with me
        </Link>{" "}
        or join our{" "}
        <Link href="https://usenotra.com/discord" style={LINK_STYLE}>
          Discord community
        </Link>
        .
      </Text>

      <Text className={PARAGRAPH}>
        Cheers,
        <br />
        Dominik & the Notra team
      </Text>
    </EmailLayout>
  );
};
