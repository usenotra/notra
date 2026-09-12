"use client";

import { createContext } from "react";

import type { GeoAnswerMentionContextValue } from "@/types/geo-answer-mentions";

const EMPTY_MENTION_CONTEXT: GeoAnswerMentionContextValue = {
  terms: [],
  competitors: [],
  organizationId: "",
  organizationSlug: "",
};

export const GeoAnswerMentionContext =
  createContext<GeoAnswerMentionContextValue>(EMPTY_MENTION_CONTEXT);
