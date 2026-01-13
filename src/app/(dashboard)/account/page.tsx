import type { Metadata } from "next";
import AccountPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
