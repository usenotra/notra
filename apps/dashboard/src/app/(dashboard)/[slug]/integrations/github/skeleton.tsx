import { Skeleton } from "@notra/ui/components/ui/skeleton";

export function GitHubIntegrationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading GitHub accounts"
      role="status"
      className="flex gap-3 border-b py-3 pb-7"
    >
      <Skeleton className="size-8 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
    </div>
  );
}

export function GitHubRepositoriesSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading repositories"
      role="status"
      className="divide-y"
    >
      {Array.from({ length: 2 }, (_, index) => `repository-${index}`).map(
        (id) => (
          <div className="space-y-4 py-5" key={id}>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-full max-w-3xl" />
            <Skeleton className="h-9 w-full max-w-3xl" />
          </div>
        )
      )}
    </div>
  );
}
