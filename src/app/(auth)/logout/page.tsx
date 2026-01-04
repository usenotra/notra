"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";

export default function LogoutPage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    authClient
      .signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
          },
        },
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  return <div>Logging out...</div>;
}
