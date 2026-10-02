import "@tanstack/react-start/server-only";
import { sendDevEmail } from "@notra/email/utils/dev";
import { getResend } from "@notra/email/utils/resend";

import type { SendWelcomeEmailProps } from "@/types/email/actions";

import { sendWelcomeEmail } from "./send";

const isDevelopment = process.env.NODE_ENV === "development";
const resend = getResend();

export async function sendWelcomeEmailAction({
  userEmail,
}: SendWelcomeEmailProps) {
  if (!resend && isDevelopment) {
    return sendDevEmail({
      from: "Dominik from Notra <dominik@hello.usenotra.com>",
      to: userEmail,
      text: "This is a mock welcome email from the founder",
      subject: "Welcome to Notra",
      _mockContext: { type: "welcome", data: { userEmail } },
    });
  }

  if (!resend) {
    throw new Error("Resend API key not set");
  }

  try {
    const { error } = await sendWelcomeEmail(resend, {
      userEmail,
    });

    if (error) {
      console.error("Failed to send welcome email:", userEmail, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error sending welcome email:", userEmail, error);
    return { success: false, error: "Failed to send email" };
  }
}
