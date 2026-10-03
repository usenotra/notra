import { isDemoMode } from "@notra/utils/demo-mode";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { DemoStart } from "@/components/demo/demo-start";
import { getCurrentDemoSandbox } from "@/lib/demo/session";
import { safeDemoReturnTo } from "@/utils/demo-return-to";

interface DemoStartPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function DemoStartPage({
  searchParams,
}: DemoStartPageProps) {
  if (!isDemoMode()) {
    notFound();
  }
  // Reads the visitor's cookie and the clock; never prerender this page.
  await connection();
  const { returnTo } = await searchParams;
  const target = safeDemoReturnTo(returnTo);

  if (await getCurrentDemoSandbox()) {
    redirect(target ?? "/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <DemoStart returnTo={target} />
    </div>
  );
}
