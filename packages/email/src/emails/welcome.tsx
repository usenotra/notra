import { Body, Head, Html, Link, Preview, Text } from "@react-email/components";

import { EMAIL_CONFIG } from "../utils/config";

interface WelcomeEmailProps {
  userEmail?: string;
}

export const WelcomeEmail = ({
  userEmail = "user@example.com",
}: WelcomeEmailProps) => {
  const appUrl = EMAIL_CONFIG.getAppUrl();

<<<<<<< HEAD
  return (
    <Html>
      <Head />
      <Preview>Welcome to Notra - A quick note from the founder</Preview>
      <Body>
        <Text>Hey!</Text>

        <Text>
          I'm Dominik, the founder of Notra. I wanted to personally welcome you
          and say thanks for signing up.
        </Text>

        <Text>
          I built Notra because I was frustrated with how scattered content
          creation had become. I hope it helps you as much as it's helped me.
        </Text>

        <Text>
          If you have any questions, feedback, or just want to chat - reply to
          this email. I read every single one.
        </Text>

        <Text>
          Cheers,
          <br />
          Dominik
        </Text>

        <Text>
          P.S. You can get started at{" "}
          <Link href={appUrl}>app.usenotra.com</Link>
        </Text>

        <Text style={{ fontSize: "12px", color: "#999", marginTop: "32px" }}>
          <Link href="https://usenotra.com/legal" style={{ color: "#999" }}>
            Legal Notice
          </Link>
          {" · "}
          <Link href="https://usenotra.com/privacy" style={{ color: "#999" }}>
            Privacy Policy
          </Link>
        </Text>
      </Body>
    </Html>
  );
=======
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
					I built Notra because I was shipping faster than ever but didn't have
					enough time to come up with tweets, changelogs or linkedIn posts. I
					hope you can stay long enough to see my full vision for Notra! :D
				</Text>

				<Text>
					If you have any questions, feedback, or just want to chat reply to
					this email. I read every single one.
				</Text>

				<Text>
					Or schedule a talk with me at{" "}
					<Link href="https://cal.com/dominikkoch">cal.com/dominikkoch</Link>!
				</Text>

				<Text>
					btw you can get started at <Link href={appUrl}>app.usenotra.com</Link>
				</Text>

				<Text>
					Cheers,
					<br />
					Dominik
				</Text>

				<Text style={{ fontSize: "12px", color: "#999", marginTop: "32px" }}>
					<Link href="https://usenotra.com/legal" style={{ color: "#999" }}>
						Legal Notice
					</Link>
					{" · "}
					<Link href="https://usenotra.com/privacy" style={{ color: "#999" }}>
						Privacy Policy
					</Link>
				</Text>
			</Body>
		</Html>
	);
>>>>>>> origin/main
};

export default WelcomeEmail;
