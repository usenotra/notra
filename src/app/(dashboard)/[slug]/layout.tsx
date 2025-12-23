import { validateWorkspaceAccess } from "@/actions/auth";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { slug } = await params;

  await validateWorkspaceAccess(slug);

  return <>{children}</>;
}
