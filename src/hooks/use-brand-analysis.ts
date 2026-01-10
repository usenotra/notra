"use client";

import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

interface BrandSettings {
  id: string;
  organizationId: string;
  companyName: string | null;
  companyDescription: string | null;
  toneProfile: string | null;
  customTone: string | null;
  customInstructions: string | null;
  audience: string | null;
  createdAt: string;
  updatedAt: string;
}

type ProgressStatus =
  | "idle"
  | "scraping"
  | "extracting"
  | "saving"
  | "completed"
  | "failed"
  | "analyzing";

interface Progress {
  status: ProgressStatus;
  currentStep: number;
  totalSteps: number;
  error?: string;
}

export function useBrandSettings(organizationId: string) {
  const data = useQuery(
    api.brand.get,
    organizationId ? { organizationId } : "skip"
  );

  const settings: BrandSettings | null = data
    ? {
        id: data._id,
        organizationId: data.organizationId,
        companyName: data.companyName ?? null,
        companyDescription: data.companyDescription ?? null,
        toneProfile: data.toneProfile ?? null,
        customTone: data.customTone ?? null,
        customInstructions: data.customInstructions ?? null,
        audience: data.audience ?? null,
        createdAt: new Date(data._creationTime).toISOString(),
        updatedAt: new Date(data.updatedAt).toISOString(),
      }
    : null;

  return {
    data: { settings },
    isLoading: data === undefined,
    error: null,
  };
}

export function useBrandAnalysisProgress(organizationId: string) {
  const hasReset = useRef(false);
  const data = useQuery(
    api.brand.getProgress,
    organizationId ? { organizationId } : "skip"
  );

  const progress: Progress = data
    ? {
        status: data.status as ProgressStatus,
        currentStep: data.progress ?? 0,
        totalSteps: 3,
        error: data.error,
      }
    : {
        status: "idle",
        currentStep: 0,
        totalSteps: 3,
      };

  const startPolling = () => {
    hasReset.current = false;
  };

  if (progress.status === "completed" && !hasReset.current) {
    hasReset.current = true;
  }

  return { progress, startPolling };
}

export function useAnalyzeBrand(organizationId: string) {
  const { startPolling } = useBrandAnalysisProgress(organizationId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/brand/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start analysis");
      }
      const data = await res.json();
      setTimeout(startPolling, 1000);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    mutateAsync: mutate,
    isPending: isLoading,
    error,
  };
}

export function useUpdateBrandSettings(organizationId: string) {
  const upsertMutation = useMutation(api.brand.upsert);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (data: {
    companyName?: string;
    companyDescription?: string;
    toneProfile?: string;
    customTone?: string;
    customInstructions?: string;
    audience?: string;
  }) => {
    setIsLoading(true);
    try {
      await upsertMutation({
        organizationId,
        companyName: data.companyName,
        companyDescription: data.companyDescription,
        toneProfile: data.toneProfile,
        customTone: data.customTone,
        customInstructions: data.customInstructions,
        audience: data.audience,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    mutateAsync: mutate,
    isPending: isLoading,
  };
}
