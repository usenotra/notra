import { APP_URL } from "@/utils/urls";

export const NAVBAR_SESSION_ENDPOINT = `${process.env.NODE_ENV === "development" ? "http://localhost:3000" : APP_URL}/api/session?view=navbar`;
export const SESSION_PROBE_TIMEOUT_MS = 4_000;
