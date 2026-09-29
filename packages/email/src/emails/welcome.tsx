import { Body, Head, Html, Link, Preview, Text } from "react-email";

import { EmailFooter } from "../components/footer";

export const WelcomeEmail = () => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Notra - A quick note from the founder</Preview>
      <Body>
        <Text>
          Hey I'm Dominik, the founder of Notra. I wanted to personally welcome
          you and say thanks for signing up.
        </Text>

        <Text>
          We built Notra because we were shipping faster than ever but didn't
          have enough time to come up with tweets, changelogs and LinkedIn
          posts.
        </Text>

        <Text>
          If you have any questions, feedback, or just want to chat reply to
          this email. We read every single one of them.
        </Text>

        <Text>
          You can also{" "}
          <Link href="https://usenotra.com/founder-chat">schedule a chat</Link>{" "}
          with us or join our{" "}
          <Link href="https://usenotra.com/discord">Discord Community</Link>!
        </Text>

        <Text>
          Cheers,
          <br />
          Dominik & The Notra Team
        </Text>

        <EmailFooter />
      </Body>
    </Html>
  );
};
