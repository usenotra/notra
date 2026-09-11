"use client";

import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRef, useState } from "react";

import { ContactFormSuccess } from "@/components/contact/contact-form-success";
import { ContactTurnstile } from "@/components/contact/contact-turnstile";
import {
  CONTACT_FORM_ASSURANCE,
  CONTACT_MESSAGE_MIN_LENGTH,
} from "@/constants/contact";
import { contactMessageSchema } from "@/schemas/contact";
import type { ContactTurnstileHandle } from "@/types/turnstile";

type SubmitStatus =
  | "idle"
  | "submitting"
  | "success"
  | "error"
  | "validation-error"
  | "verification-error"
  | "rate-limited";

const cardClass =
  "flex flex-col gap-5 rounded-3xl border border-[#ECECEC] bg-white p-9 shadow-[0_0.0625rem_0.1875rem_#28282814] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
const fieldErrorClass = "font-sans text-destructive text-sm";
const labelClass =
  "font-sans font-medium text-[#1E1E1E] text-sm/4.5 dark:text-white";
const inputClass =
  "h-11 rounded-xl border-[#E4E4E4] bg-transparent px-3.5 py-3 text-[0.9375rem]/5 shadow-none placeholder:text-[#1E1E1E66] dark:border-white/12 dark:placeholder:text-white/40";

export function ContactForm() {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<ContactTurnstileHandle>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
      message: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = contactMessageSchema.safeParse(value);

      if (!parsed.success) {
        setStatus("validation-error");
        return;
      }

      if (!turnstileToken) {
        setStatus("verification-error");
        return;
      }

      setStatus("submitting");

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          "cf-turnstile-response": turnstileToken,
        }),
      }).catch(() => null);

      turnstile.current?.reset();

      if (!response) {
        setStatus("error");
        return;
      }

      if (response.status === 429) {
        setStatus("rate-limited");
        return;
      }

      if (response.status === 403) {
        setStatus("verification-error");
        return;
      }

      setStatus(response.ok ? "success" : "error");
    },
  });

  if (status === "success") {
    return <ContactFormSuccess />;
  }

  const isSubmitting = status === "submitting";

  return (
    <form
      className={cardClass}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <h2 className="font-display text-[1.625rem]/8 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
        Send us a message
      </h2>

      <div className="flex flex-col gap-4 sm:flex-row">
        <form.Field
          name="name"
          validators={{
            onBlur: ({ value }) =>
              contactMessageSchema.shape.name.safeParse(value).error?.issues[0]
                ?.message,
          }}
        >
          {(field) => (
            <div className="flex grow basis-0 flex-col gap-2">
              <Label className={labelClass} htmlFor={field.name}>
                Name
              </Label>
              <Input
                aria-invalid={field.state.meta.errors.length > 0}
                className={inputClass}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Jane Doe"
                required
                value={field.state.value}
              />
              {field.state.meta.errors.length > 0 ? (
                <p className={fieldErrorClass}>{field.state.meta.errors[0]}</p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field
          name="email"
          validators={{
            onBlur: ({ value }) =>
              contactMessageSchema.shape.email.safeParse(value).error?.issues[0]
                ?.message,
          }}
        >
          {(field) => (
            <div className="flex grow basis-0 flex-col gap-2">
              <Label className={labelClass} htmlFor={field.name}>
                Email
              </Label>
              <Input
                aria-invalid={field.state.meta.errors.length > 0}
                className={inputClass}
                id={field.name}
                inputMode="email"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="jane@example.com"
                required
                type="email"
                value={field.state.value}
              />
              {field.state.meta.errors.length > 0 ? (
                <p className={fieldErrorClass}>{field.state.meta.errors[0]}</p>
              ) : null}
            </div>
          )}
        </form.Field>
      </div>

      <form.Field
        name="company"
        validators={{
          onBlur: ({ value }) =>
            contactMessageSchema.shape.company.safeParse(value).error?.issues[0]
              ?.message,
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label className={labelClass} htmlFor={field.name}>
              Company{" "}
              <span className="text-[0.8125rem]/4.25 font-normal text-[#1E1E1E66] dark:text-white/40">
                optional
              </span>
            </Label>
            <Input
              aria-invalid={field.state.meta.errors.length > 0}
              className={inputClass}
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Acme Inc."
              value={field.state.value}
            />
            {field.state.meta.errors.length > 0 ? (
              <p className={fieldErrorClass}>{field.state.meta.errors[0]}</p>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field
        name="message"
        validators={{
          onBlur: ({ value }) =>
            contactMessageSchema.shape.message.safeParse(value).error?.issues[0]
              ?.message,
        }}
      >
        {(field) => {
          const trimmedLength = field.state.value.trim().length;
          const charsRemaining = CONTACT_MESSAGE_MIN_LENGTH - trimmedLength;

          return (
            <div className="flex flex-col gap-2">
              <Label className={labelClass} htmlFor={field.name}>
                Message
              </Label>
              <Textarea
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-40 min-h-40 resize-none rounded-xl border-[#E4E4E4] bg-transparent px-3.5 py-3 text-[0.9375rem]/5.5 placeholder:text-[#1E1E1E66] dark:border-white/12 dark:placeholder:text-white/40"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Tell us what you're working on and how we can help."
                required
                value={field.state.value}
              />
              <div className="flex items-center justify-between gap-3">
                {field.state.meta.errors.length > 0 ? (
                  <p className={fieldErrorClass}>
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
                <span className="ml-auto shrink-0 font-sans text-xs text-[#1E1E1E80] dark:text-white/40">
                  {charsRemaining > 0
                    ? `${charsRemaining} more character${charsRemaining === 1 ? "" : "s"} needed`
                    : `${trimmedLength} characters`}
                </span>
              </div>
            </div>
          );
        }}
      </form.Field>

      <ContactTurnstile onToken={setTurnstileToken} ref={turnstile} />

      <div aria-live="assertive" role="alert">
        {status === "verification-error" ? (
          <p className={fieldErrorClass}>
            Please complete the verification before sending your message.
          </p>
        ) : null}
        {status === "validation-error" ? (
          <p className={fieldErrorClass}>
            Please complete the required fields before sending your message.
          </p>
        ) : null}

        {status === "error" ? (
          <p className={fieldErrorClass}>
            Something went wrong sending your message. Please try again, or
            email us at hello@usenotra.com.
          </p>
        ) : null}

        {status === "rate-limited" ? (
          <p className={fieldErrorClass}>
            You've sent too many messages recently. Please try again in about an
            hour, or email us at hello@usenotra.com.
          </p>
        ) : null}
      </div>

      <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-[0.8125rem]/4.5 text-[#1E1E1E80] dark:text-white/50">
            {CONTACT_FORM_ASSURANCE}
          </p>
          <p className="font-sans text-xs/4.5 text-[#1E1E1E80] dark:text-white/40">
            By submitting you agree to our{" "}
            <Link
              className="hover:text-primary font-medium text-[#1E1E1E] underline underline-offset-2 dark:text-white"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <CtaButton
              className="px-7 text-[0.9375rem]/4.75 tracking-[-0.01em]"
              disabled={!canSubmit || isSubmitting || !turnstileToken}
              type="submit"
              variant="primary"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </CtaButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
