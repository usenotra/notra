"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function BannedNotice() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signOut = authClient.useSignOut();

  function handleSignOut() {
    setIsSigningOut(true);
    signOut().catch(() => setIsSigningOut(false));
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-md border p-8 text-center">
      <h1 className="text-lg font-semibold">Account suspended</h1>
      <p className="text-muted-foreground text-sm">
        Your account has been suspended. If you believe this is a mistake,
        contact support at support@usenotra.com.
      </p>
      <Button disabled={isSigningOut} onClick={handleSignOut} variant="outline">
        Sign out
      </Button>
    </div>
  );
}
