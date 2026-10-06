import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Tailwind,
  Text,
} from "react-email";

import { EMAIL_THEME } from "../constants/theme";
import { EmailFooter } from "./footer";
import { EmailLogo } from "./logo";

/** Shared frame for every Notra email: wordmark, heading, body, footer. */
export const EmailLayout = ({
  preview,
  heading,
  subtext,
  children,
}: {
  preview: string;
  heading: ReactNode;
  subtext?: ReactNode;
  children: ReactNode;
}) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body
        className="mx-auto my-auto bg-white px-2"
        style={{ fontFamily: EMAIL_THEME.fontFamily }}
      >
        <Container className="mx-auto mt-[16px] mb-[40px] max-w-[465px] rounded px-[20px] pt-0 pb-[20px]">
          <EmailLogo className="mt-0 text-center" variant="lockup" />

          <Heading className="mt-5 mb-3 text-center text-2xl font-medium text-black">
            {heading}
          </Heading>
          {subtext ? (
            <Text className="mt-0 mb-8 text-center text-base leading-relaxed text-[#737373]">
              {subtext}
            </Text>
          ) : null}

          {children}

          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
