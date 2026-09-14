"use client";

import { DbClient, DbProvider } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [dbClient] = useState(() => new DbClient({ queryClient }));

  return <DbProvider client={dbClient}>{children}</DbProvider>;
}
