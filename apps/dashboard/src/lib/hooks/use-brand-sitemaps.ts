"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Sitemap,
  SitemapListResponse,
  SitemapPagesResponse,
  SitemapsQueryOptions,
} from "@/types/hooks/brand-sitemaps";

import { dashboardOrpc } from "../orpc/query";
import { fetchAllSitemapPages } from "../sitemap/api-client";

function sitemapsQueryKey(organizationId: string, voiceId: string) {
  return dashboardOrpc.brand.sitemaps.list.queryKey({
    input: { organizationId, voiceId },
  });
}

function sitemapPagesQueryKey(
  organizationId: string,
  voiceId: string,
  sitemapId: string
) {
  return dashboardOrpc.brand.sitemaps.pages.queryKey({
    input: { organizationId, sitemapId, voiceId },
  });
}

export function useSitemaps(
  organizationId: string,
  voiceId: string,
  options?: SitemapsQueryOptions
) {
  return useQuery<SitemapListResponse>(
    dashboardOrpc.brand.sitemaps.list.queryOptions({
      input: { organizationId, voiceId },
      enabled: !!organizationId && !!voiceId && (options?.enabled ?? true),
    })
  );
}

export function useSitemapPages(
  organizationId: string,
  voiceId: string,
  sitemapId: string
) {
  return useQuery<SitemapPagesResponse>({
    queryKey: sitemapPagesQueryKey(organizationId, voiceId, sitemapId),
    queryFn: () => fetchAllSitemapPages(organizationId, voiceId, sitemapId),
    enabled: !!organizationId && !!voiceId && !!sitemapId,
  });
}

export function useCreateSitemap(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation<Sitemap, Error, { url: string; label?: string }>({
    mutationFn: async (input) => {
      const result = await dashboardOrpc.brand.sitemaps.create.call({
        ...input,
        organizationId,
        voiceId,
      });

      queryClient.setQueryData<SitemapPagesResponse>(
        sitemapPagesQueryKey(organizationId, voiceId, result.sitemap.id),
        { pages: result.pages }
      );

      return result.sitemap;
    },
    onSuccess: (sitemap) => {
      queryClient.setQueryData<SitemapListResponse>(
        sitemapsQueryKey(organizationId, voiceId),
        (current) => ({
          sitemaps: [
            ...(current?.sitemaps.filter((item) => item.id !== sitemap.id) ??
              []),
            sitemap,
          ],
        })
      );
    },
  });
}

export function useDeleteSitemap(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (sitemapId) => {
      await dashboardOrpc.brand.sitemaps.delete.call({
        organizationId,
        sitemapId,
        voiceId,
      });
    },
    onSuccess: (_data, sitemapId) => {
      queryClient.setQueryData<SitemapListResponse>(
        sitemapsQueryKey(organizationId, voiceId),
        (current) => ({
          sitemaps:
            current?.sitemaps.filter((sitemap) => sitemap.id !== sitemapId) ??
            [],
        })
      );
      queryClient.removeQueries({
        queryKey: sitemapPagesQueryKey(organizationId, voiceId, sitemapId),
      });
    },
  });
}
