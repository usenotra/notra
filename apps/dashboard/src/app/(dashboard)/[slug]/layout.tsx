import { validateOrganizationAccess } from "@/lib/auth/actions";

interface OrganizationLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrganizationLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  const { slug } = await params;

  await validateOrganizationAccess(slug);

  return <>{children}</>;
}
