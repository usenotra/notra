"use client";

import type { CreateReferenceInput } from "@notra/schemas/dashboard/brand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  BrandReference,
  FetchedTweetResponse,
} from "@/types/hooks/brand-references";

import { dashboardOrpc } from "../orpc/query";

export function useReferences(organizationId: string, voiceId: string) {
  return useQuery<{ references: BrandReference[] }>(
    dashboardOrpc.brand.references.list.queryOptions({
      input: { organizationId, voiceId },
      enabled: !!organizationId && !!voiceId,
    })
  );
}

export function useCreateReferenceForVoice(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voiceId,
      data,
    }: {
      voiceId: string;
      data: CreateReferenceInput;
    }) => {
      return dashboardOrpc.brand.references.create.call({
        organizationId,
        voiceId,
        ...data,
      });
    },
    onSuccess: (_result, { voiceId }) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.references.list.queryKey({
          input: { organizationId, voiceId },
        }),
      });
    },
  });
}

export function useCreateReference(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReferenceInput) => {
      return dashboardOrpc.brand.references.create.call({
        organizationId,
        voiceId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.references.list.queryKey({
          input: { organizationId, voiceId },
        }),
      });
    },
  });
}

export function useDeleteReference(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referenceId: string) => {
      return dashboardOrpc.brand.references.delete.call({
        organizationId,
        voiceId,
        referenceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.references.list.queryKey({
          input: { organizationId, voiceId },
        }),
      });
    },
  });
}

export function useUpdateReference(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      referenceId,
      data,
    }: {
      referenceId: string;
      data: {
        note?: string | null;
        content?: string;
        sourceUrl?: string | null;
        applicableTo?: string[];
      };
    }) => {
      const applicableTo = data.applicableTo as
        | ("all" | "twitter" | "linkedin" | "blog")[]
        | undefined;

      return dashboardOrpc.brand.references.update.call({
        organizationId,
        voiceId,
        referenceId,
        ...data,
        applicableTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.references.list.queryKey({
          input: { organizationId, voiceId },
        }),
      });
    },
  });
}

export function useImportTweets(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      accountId: string;
      maxResults?: number;
    }): Promise<{
      count: number;
      references: BrandReference[];
    }> => {
      return dashboardOrpc.brand.references.importTweets.call({
        organizationId,
        voiceId,
        accountId: input.accountId,
        maxResults: input.maxResults ?? 20,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.references.list.queryKey({
          input: { organizationId, voiceId },
        }),
      });
    },
  });
}

export function useFetchTweet(organizationId: string, voiceId: string) {
  return useMutation({
    mutationFn: async (url: string): Promise<FetchedTweetResponse> => {
      return dashboardOrpc.brand.references.fetchTweet.call({
        organizationId,
        voiceId,
        url,
      });
    },
  });
}
