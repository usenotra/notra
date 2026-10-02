import { afterResponse } from "@/lib/framework/after-response";

export function after(task: () => void | Promise<void>) {
  afterResponse(task);
}
