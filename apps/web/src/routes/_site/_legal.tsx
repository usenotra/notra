import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/_legal")({
  component: LegalLayout,
});

function LegalLayout() {
  return (
    <div className="w-full max-w-180 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 md:px-8 md:pt-32 lg:px-0">
      <article className="prose prose-neutral dark:prose-invert prose-a:font-medium prose-headings:font-display prose-headings:font-medium prose-p:font-sans prose-strong:font-sans prose-a:text-primary prose-headings:text-[#1E1E1E] prose-li:text-[#1E1E1EBF] prose-p:text-[#1E1E1EBF] prose-strong:text-[#1E1E1E] prose-p:leading-7 prose-headings:tracking-[-0.02em] prose-a:no-underline hover:prose-a:underline dark:prose-headings:text-white dark:prose-li:text-white/70 dark:prose-p:text-white/70 dark:prose-strong:text-white max-w-none">
        <Outlet />
      </article>
    </div>
  );
}
