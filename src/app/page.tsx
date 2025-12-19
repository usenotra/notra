import Link from "next/link";
import { ChangelogButton } from "@/components/changelog-button";

export default async function Page() {
  return (
    <div>
      <Link href="/login">Login</Link>
      <Link href="/signup">Signup</Link> |{" "}
      <Link href="/dashboard">Dashboard</Link>
      <ChangelogButton />
    </div>
  );
}
