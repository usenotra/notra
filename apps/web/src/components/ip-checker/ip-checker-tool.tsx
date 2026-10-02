import { Loading03Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { AnimatePresence, domAnimation, LazyMotion } from "motion/react";
import { parseAsString, useQueryState } from "nuqs";
import { type FormEvent, useRef, useState } from "react";

import {
  IP_CHECKER_PLACEHOLDER,
  IP_CHECKER_QUERY_KEY,
  IP_CHECKER_STATUS_MESSAGES,
} from "@/constants/ip-checker";
import {
  ipCheckRequestSchema,
  ipCheckResultSchema,
} from "@/schemas/ip-checker";
import type {
  IpCheckResult,
  IpCheckStatus,
  IpCheckerToolProps,
} from "@/types/ip-checker";

import { AnimatedHeight } from "./animated-height";
import { IpCheckNotice } from "./ip-check-notice";
import { IpCheckResultCard } from "./ip-check-result-card";

export function IpCheckerTool({
  samples,
  initialIp,
  initialResult,
}: IpCheckerToolProps) {
  const [, setIpParam] = useQueryState(
    IP_CHECKER_QUERY_KEY,
    parseAsString.withOptions({ history: "replace" })
  );
  const [ip, setIp] = useState(initialIp ?? "");
  const [status, setStatus] = useState<IpCheckStatus>(() => {
    if (initialResult) {
      return "done";
    }
    return initialIp ? "invalid" : "idle";
  });
  const [result, setResult] = useState<IpCheckResult | null>(
    initialResult ?? null
  );

  const requestIdRef = useRef(0);

  const runCheck = async (candidate: string) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const isLatest = () => requestIdRef.current === requestId;
    const parsed = ipCheckRequestSchema.safeParse({ ip: candidate });
    if (!parsed.success) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    const response = await fetch("/api/ip-checker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    if (!isLatest()) {
      return;
    }
    if (!response) {
      setStatus("error");
      return;
    }
    if (response.status === 422 || response.status === 400) {
      setStatus("invalid");
      return;
    }
    if (response.status === 429) {
      setStatus("rate-limited");
      return;
    }
    const payload = ipCheckResultSchema.safeParse(
      await response.json().catch(() => null)
    );
    if (!isLatest()) {
      return;
    }
    if (!(response.ok && payload.success)) {
      setStatus("error");
      return;
    }
    setResult(payload.data);
    setStatus("done");
    setIpParam(payload.data.ip);
  };

  const handleInputChange = (value: string) => {
    setIp(value);
    requestIdRef.current += 1;
    if (status === "checking") {
      setStatus("idle");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runCheck(ip);
  };

  const handleSample = (sample: string) => {
    setIp(sample);
    runCheck(sample);
  };

  const isChecking = status === "checking";
  const message = IP_CHECKER_STATUS_MESSAGES[status];

  return (
    <div className="flex flex-col gap-5">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Label
          className="font-sans text-sm/4.5 font-medium text-[#1E1E1E] dark:text-white"
          htmlFor="ip-checker-input"
        >
          IP address
        </Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative grow">
            <HugeiconsIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#1E1E1E66] dark:text-white/40"
              icon={Search01Icon}
            />
            <Input
              aria-invalid={status === "invalid"}
              autoComplete="off"
              className="h-11 rounded-xl border-[#E4E4E4] bg-transparent py-3 pr-3.5 pl-10 font-mono text-[0.9375rem]/5 shadow-none placeholder:font-sans placeholder:text-[#1E1E1E66] dark:border-white/12 dark:placeholder:text-white/40"
              id="ip-checker-input"
              inputMode="text"
              name="ip"
              onChange={(event) => handleInputChange(event.target.value)}
              placeholder={IP_CHECKER_PLACEHOLDER}
              spellCheck={false}
              value={ip}
            />
          </div>
          <CtaButton
            className="font-display h-auto shrink-0 rounded-[2.5625rem] px-6 py-3 text-[1.125rem] leading-[1.14] font-medium tracking-[-0.015em]"
            disabled={isChecking}
            type="submit"
          >
            <span className="grid place-items-center">
              <span
                aria-hidden={isChecking}
                className={
                  isChecking ? "invisible [grid-area:1/1]" : "[grid-area:1/1]"
                }
              >
                Check IP
              </span>
              {isChecking ? (
                <HugeiconsIcon
                  className="size-5 animate-spin [grid-area:1/1]"
                  icon={Loading03Icon}
                />
              ) : null}
            </span>
          </CtaButton>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E99] dark:text-white/50">
          Try one
        </span>
        {samples.map((sample) => (
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#1E1E1E14] bg-white px-2.5 py-1 font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E] transition-colors hover:border-[#8B5CF6] hover:text-[#8B5CF6] disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#A78BFA] dark:hover:text-[#A78BFA]"
            disabled={isChecking}
            key={sample.ip}
            onClick={() => handleSample(sample.ip)}
            type="button"
          >
            <EngineIcon className="size-3.5" engine={sample.label} />
            {sample.label}
          </button>
        ))}
      </div>

      <LazyMotion features={domAnimation}>
        <AnimatedHeight>
          <AnimatePresence initial={false} mode="wait">
            {message ? (
              <IpCheckNotice key={status} message={message} status={status} />
            ) : null}
            {!message && result && (status === "done" || isChecking) ? (
              <IpCheckResultCard key={result.ip} result={result} />
            ) : null}
          </AnimatePresence>
        </AnimatedHeight>
      </LazyMotion>
    </div>
  );
}
