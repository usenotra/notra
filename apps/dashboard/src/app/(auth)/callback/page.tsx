import { redirect } from "next/navigation";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";

export default async function AuthCallback(props: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await getSession();
  const searchParams = await props.searchParams;
  const returnTo = searchParams.returnTo;

  if (!session?.user) {
    redirect("/login");
  }

  // If returnTo is provided and it's a valid path, redirect there
  if (returnTo && typeof returnTo === "string") {
    // Validate that returnTo is a relative path (security check)
    if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      redirect(returnTo);
    }
  }

  const organization = await getLastActiveOrganization(session.user.id);

  if (organization) {
    redirect(`/${organization.slug}`);
  }

  redirect("/onboarding");
}
