"use client";

import { localStorageKeys } from "@/constants/storage";

export function readStoredGitHubPublishRepositoryId(
  organizationId: string
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(
      localStorageKeys.githubPublishRepository(organizationId)
    );
  } catch {
    return null;
  }
}

export function writeStoredGitHubPublishRepositoryId(
  organizationId: string,
  repositoryId: string
): void {
  if (typeof window === "undefined" || repositoryId.length === 0) {
    return;
  }

  try {
    window.localStorage.setItem(
      localStorageKeys.githubPublishRepository(organizationId),
      repositoryId
    );
  } catch {
    return;
  }
}
