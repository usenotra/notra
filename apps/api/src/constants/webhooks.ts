import { errorResponse } from "../utils/openapi-responses";

export const WEBHOOK_ERROR_RESPONSES = {
  400: errorResponse("Invalid webhook request"),
  401: errorResponse("Unauthorized"),
  402: errorResponse("Subscription required"),
  403: errorResponse("Forbidden"),
  404: errorResponse("Webhook not found"),
  429: errorResponse("Rate limit exceeded"),
  500: errorResponse("Subscription verification failed"),
  503: errorResponse("Webhooks unavailable"),
};
