import { render } from "react-email";

import type { EmailResult, SendBrewEmailOptions } from "../types/brew";

export async function logDevEmail({
  category,
  to,
  subject,
  react,
}: SendBrewEmailOptions): Promise<EmailResult> {
  const text = await render(react, { plainText: true });

  console.log("--- MOCK EMAIL SENT (DEVELOPMENT MODE) ---");
  console.log("Category:", category);
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log(text);
  console.log("----------------------------------------------");

  return { data: { id: "mock-email-id" }, error: null };
}
