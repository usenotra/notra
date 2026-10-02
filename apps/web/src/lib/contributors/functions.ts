import { createServerFn } from "@tanstack/react-start";

import { fetchContributorsData } from "@/utils/github";

export const getContributorsData = createServerFn({ method: "GET" }).handler(
  () => fetchContributorsData()
);
