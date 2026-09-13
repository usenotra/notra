import { postgresDatabaseLayer } from "@notra/webhooks/runtime/postgres";
import { ManagedRuntime } from "effect";

export const webhookRuntime = ManagedRuntime.make(postgresDatabaseLayer);
