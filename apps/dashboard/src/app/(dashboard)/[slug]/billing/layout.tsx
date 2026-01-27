import type { ReactNode } from "react";

interface BillingLayoutProps {
  children: ReactNode;
}

export default function BillingLayout({ children }: BillingLayoutProps) {
  return <>{children}</>;
}
