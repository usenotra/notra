"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Sitemap,
  SitemapListResponse,
  SitemapPagesResponse,
  SitemapsQueryOptions,
} from "@/types/hooks/brand-sitemaps";

import { fetchAllSitemapPages, fetchSitemapJson } from "../sitemap/api-client";
import { sitemapPagesKey, sitemapsKey } from "../sitemap/query-keys";

export function useSitemaps(
  organizationId: string,
  voiceId: string,
  options?: SitemapsQueryOptions
) {
  return useQuery<SitemapListResponse>({
    queryKey: sitemapsKey(organizationId, voiceId),
    queryFn: () =>
      fetchSitemapJson<SitemapListResponse>(
        `/api/organizations/${organizationId}/brand-identities/${voiceId}/sitemaps`
      ),
    enabled: !!organizationId && !!voiceId && (options?.enabled ?? true),
  });
}

export function useSitemapPages(
  organizationId: string,
  voiceId: string,
  sitemapId: string
) {
  return useQuery<SitemapPagesResponse>({
    queryKey: sitemapPagesKey(organizationId, voiceId, sitemapId),
    queryFn: () => fetchAllSitemapPages(organizationId, voiceId, sitemapId),
    enabled: !!organizationId && !!voiceId && !!sitemapId,
  });
}

export function useCreateSitemap(organizationId: string, voiceId: string) {
  const queryClient = useQueryClient();

  return useMutation<Sitemap, Error, { url: string; label?: string }>({
    mutationFn: async (input) => {
      const result = await fetchSitemapJson<{
        sitemap: Sitemap;
        pages: SitemapPagesResponse["pages"];
      }>(
        `/api/organizations/${organizationId}/brand-identities/${voiceId}/sitemaps`,
        {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      queryClient.setQueryData<SitemapPagesResponse>(
        sitemapPagesKey(organizationId, voiceId, result.sitemap.id),
        { pages: result.pages }
      );

      return result.sitemap;
    },
    onSuccess: (sitemap) => {
      queryClient.setQueryData<SitemapListResponse>(
        sitemapsKey(organizationId, voiceId),
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
      await fetchSitemapJson(
        `/api/organizations/${organizationId}/brand-identities/${voiceId}/sitemaps/${sitemapId}`,
        { method: "DELETE" }
      );
    },
    onSuccess: (_data, sitemapId) => {
      queryClient.setQueryData<SitemapListResponse>(
        sitemapsKey(organizationId, voiceId),
        (current) => ({
          sitemaps:
            current?.sitemaps.filter((sitemap) => sitemap.id !== sitemapId) ??
            [],
        })
      );
      queryClient.removeQueries({
        queryKey: sitemapPagesKey(organizationId, voiceId, sitemapId),
      });
    },
  });
}
