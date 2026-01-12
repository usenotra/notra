import type { ReactElement } from "react";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  if (!resend) {
    console.log("========================================");
    console.log("EMAIL (dev mode - no RESEND_API_KEY set)");
    console.log("========================================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`React Component: ${react.type.name || "Email"}`);
    console.log(`Props: ${JSON.stringify(react.props, null, 2)}`);
    console.log("========================================");
    return { success: true, data: { id: "dev-mode" } };
  }

  const { data, error } = await resend.emails.send({
    from: "Notra <noreply@usenotra.com>",
    to,
    subject,
    react,
  });

  if (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }

  return { success: true, data };
}
