import { redirect } from "next/navigation";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";

export default async function AuthCallback() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization(session.user.id);

  if (organization) {
    redirect(`/${organization.slug}`);
  }

  redirect("/onboarding");
}
