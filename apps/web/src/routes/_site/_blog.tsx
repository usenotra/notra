import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/_blog")({
  component: BlogLayout,
});

function BlogLayout() {
  return (
    <div className="flex w-full flex-col items-center pb-16">
      <Outlet />
    </div>
  );
}
