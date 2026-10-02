import { createSerializer, parseAsString } from "nuqs";

export const DATABUDDY_SIGNUP_STARTED_EVENT = "signup_started";

const signupAttributionSearchParams = {
  source: parseAsString,
};

const signupAttributionUrlKeys = {
  source: "db_source",
} as const;

export const serializeSignupAttribution = createSerializer(
  signupAttributionSearchParams,
  {
    urlKeys: signupAttributionUrlKeys,
  }
);
