import { Skeleton } from "@notra/ui/components/ui/skeleton";

export function GitHubIntegrationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading GitHub accounts"
      role="status"
      className="flex min-h-36 flex-col justify-center px-5 py-2"
    >
      {Array.from({ length: 2 }, (_, index) => `account-${index}`).map((id) => (
        <div className="flex flex-1 items-center gap-3 py-3" key={id}>
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="size-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function GitHubRepositoriesSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading repositories"
      role="status"
      className="space-y-4"
    >
      {Array.from({ length: 2 }, (_, index) => `repository-${index}`).map(
        (id) => (
          <div className="border-border bg-muted rounded-2xl border" key={id}>
            <div className="flex items-center gap-3 px-5 py-4 pb-9">
              <Skeleton className="size-7 rounded-md" />
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="ml-auto size-7 rounded-md" />
            </div>
            <div className="border-border bg-background -mx-px -mt-5 -mb-px grid gap-3 rounded-2xl border p-5 sm:grid-cols-2">
              {["changelog", "blog"].map((column) => (
                <div className="space-y-3" key={column}>
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
