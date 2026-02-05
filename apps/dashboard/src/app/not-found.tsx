import { Button } from "@notra/ui/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="font-medium text-muted-foreground text-sm">404</p>
        <h1 className="mt-2 font-bold text-3xl text-foreground tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved or deleted.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button render={<Link href="/">Go home</Link>} />
          <Button
            render={<Link href="javascript:history.back()">Go back</Link>}
            variant="outline"
          />
        </div>
      </div>
    </div>
  );
}
