import { IntegrationsBackLink } from "@/components/integrations/integrations-back-link";

export default function IntegrationsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      <IntegrationsBackLink />
      {children}
      {modal}
    </>
  );
}
