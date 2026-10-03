import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { EmailFooter } from "../components/footer";
import { EmailLogo } from "../components/logo";
import type { ContactMessageEmailProps } from "../types/contact";

export const ContactMessageEmail = ({
  name = "Jane Doe",
  email = "jane@example.com",
  company,
  message = "We're evaluating Notra for our team and would love to chat about volume pricing.",
}: ContactMessageEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        New contact message from {name}
        {company ? ` (${company})` : ""}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[520px] rounded p-[20px]">
            <EmailLogo />

            <Heading className="my-6 text-center text-2xl font-medium text-black">
              New contact message
            </Heading>

            <Section className="mt-6 rounded-md border border-solid border-[#eaeaea] bg-[#fafafa] p-5">
              <Text className="m-0 text-[15px] leading-[22px] whitespace-pre-wrap text-black">
                {message}
              </Text>
            </Section>

            <Section className="mt-8">
              <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                From
              </Text>
              <Text className="mt-1 mb-0 text-[14px] leading-[22px] text-black">
                {name} &lt;
                <Link className="text-black underline" href={`mailto:${email}`}>
                  {email}
                </Link>
                &gt;
              </Text>
            </Section>

            {company ? (
              <Section className="mt-4">
                <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                  Company
                </Text>
                <Text className="mt-1 mb-0 text-[14px] leading-[22px] text-black">
                  {company}
                </Text>
              </Section>
            ) : null}

            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ContactMessageEmail;
