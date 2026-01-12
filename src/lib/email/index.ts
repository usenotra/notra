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
    const resetUrl = react.props?.resetUrl as string | undefined;
    console.log("[Email Dev Mode]", subject, "→", to);
    if (resetUrl) {
      console.log("[Reset URL]", resetUrl);
    }
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
