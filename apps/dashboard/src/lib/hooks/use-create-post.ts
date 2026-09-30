"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreatePostMutationResult,
  CreatePostMutationVariables,
} from "@/types/content/create-post";

import { dashboardOrpc } from "../orpc/query";

export function useCreatePost(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    CreatePostMutationResult,
    Error,
    CreatePostMutationVariables
  >({
    mutationFn: (variables) => dashboardOrpc.content.create.call(variables),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.list.key(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.recents.key(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.collections.list.key(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.home.get.queryKey({
          input: { organizationId },
        }),
      });
    },
  });
}
