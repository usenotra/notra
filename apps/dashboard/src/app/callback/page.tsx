import { redirect } from "next/navigation";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";

export default async function AuthCallback(props: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await getSession();
  const searchParams = await props.searchParams;
  let returnTo = searchParams.returnTo;

  if (!session?.user) {
    redirect("/login");
  }

  // If returnTo is provided and it's a valid path, redirect there
  if (returnTo && typeof returnTo === "string") {
    // Decode URL-encoded returnTo (Next.js should auto-decode, but be explicit)
    try {
      returnTo = decodeURIComponent(returnTo);
    } catch {
      // If decoding fails, use original value
    }
    // Validate that returnTo is a relative path (security check)
    if (
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.includes("\\")
    ) {
      // Redirect to returnTo before checking for organization
      redirect(returnTo);
      return; // Ensure we don't continue to organization redirect
    }
  }

  const organization = await getLastActiveOrganization(session.user.id);

  if (organization) {
    redirect(`/${organization.slug}`);
  }

  redirect("/onboarding");
}
