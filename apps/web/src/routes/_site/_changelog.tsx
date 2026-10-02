import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/_changelog")({
  component: ChangelogLayout,
});

function ChangelogLayout() {
  return (
    <div className="flex w-full flex-col items-center pb-16">
      <Outlet />
    </div>
  );
}
