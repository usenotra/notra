/**
 * Thin WebAuthn client without a library: WorkOS hands us JSON options
 * (base64url strings) and expects the credential back as JSON. Modern
 * browsers do that conversion natively via
 * `PublicKeyCredential.parseCreationOptionsFromJSON()` / `credential.toJSON()`;
 * older ones get a manual fallback below.
 */

import type {
  PasskeyAssertionOutcome,
  PasskeyAuthenticationResponseJSON,
  PasskeyCreationOutcome,
  PasskeyRegistrationResponseJSON,
} from "@/types/auth/security";

const CANCELLED_ERROR_NAME = "NotAllowedError";
const ALREADY_REGISTERED_ERROR_NAME = "InvalidStateError";
const BASE64_PAD_MODULUS = 4;
const BASE64URL_DASH_REGEX = /-/g;
const BASE64URL_UNDERSCORE_REGEX = /_/g;
const BASE64_PLUS_REGEX = /\+/g;
const BASE64_SLASH_REGEX = /\//g;
const BASE64_PADDING_REGEX = /=+$/;

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(BASE64_PLUS_REGEX, "-")
    .replace(BASE64_SLASH_REGEX, "_")
    .replace(BASE64_PADDING_REGEX, "");
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value
    .replace(BASE64URL_DASH_REGEX, "+")
    .replace(BASE64URL_UNDERSCORE_REGEX, "/");
  const padding =
    (BASE64_PAD_MODULUS - (base64.length % BASE64_PAD_MODULUS)) %
    BASE64_PAD_MODULUS;
  const binary = atob(base64 + "=".repeat(padding));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator.credentials?.create === "function"
  );
}

function hasNativeJsonSupport() {
  return (
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function" &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === "function"
  );
}

function parseCreationOptions(
  options: PublicKeyCredentialCreationOptionsJSON
): PublicKeyCredentialCreationOptions {
  if (hasNativeJsonSupport()) {
    return PublicKeyCredential.parseCreationOptionsFromJSON(options);
  }
  // Fallback for browsers without the JSON helpers: only the binary fields
  // need converting, the enum-like strings pass through unchanged.
  const { extensions: _extensions, ...rest } = options;
  const parsed = {
    ...rest,
    challenge: base64UrlToBuffer(options.challenge),
    user: { ...options.user, id: base64UrlToBuffer(options.user.id) },
    excludeCredentials: options.excludeCredentials?.map(
      (credential): PublicKeyCredentialDescriptor => ({
        type: "public-key",
        id: base64UrlToBuffer(credential.id),
        transports: credential.transports as
          | AuthenticatorTransport[]
          | undefined,
      })
    ),
  };
  return parsed as PublicKeyCredentialCreationOptions;
}

function parseRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptions {
  if (hasNativeJsonSupport()) {
    return PublicKeyCredential.parseRequestOptionsFromJSON(options);
  }
  const { extensions: _extensions, ...rest } = options;
  const parsed = {
    ...rest,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map(
      (credential): PublicKeyCredentialDescriptor => ({
        type: "public-key",
        id: base64UrlToBuffer(credential.id),
        transports: credential.transports as
          | AuthenticatorTransport[]
          | undefined,
      })
    ),
  };
  return parsed as PublicKeyCredentialRequestOptions;
}

function registrationToJson(
  credential: PublicKeyCredential
): PasskeyRegistrationResponseJSON {
  if (typeof credential.toJSON === "function") {
    return credential.toJSON() as unknown as PasskeyRegistrationResponseJSON;
  }
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key",
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports:
        typeof response.getTransports === "function"
          ? response.getTransports()
          : [],
    },
  };
}

function assertionToJson(
  credential: PublicKeyCredential
): PasskeyAuthenticationResponseJSON {
  if (typeof credential.toJSON === "function") {
    return credential.toJSON() as unknown as PasskeyAuthenticationResponseJSON;
  }
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key",
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle
        ? bufferToBase64Url(response.userHandle)
        : null,
    },
  };
}

function describeFailure(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === CANCELLED_ERROR_NAME) {
    return { cancelled: true, message: "The passkey prompt was cancelled." };
  }
  if (error instanceof Error && error.name === ALREADY_REGISTERED_ERROR_NAME) {
    return {
      cancelled: false,
      message: "This device already has a passkey for your account.",
    };
  }
  return { cancelled: false, message: fallback };
}

export async function createPasskeyCredential(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<PasskeyCreationOutcome> {
  try {
    const credential = await navigator.credentials.create({
      publicKey: parseCreationOptions(options),
    });
    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error("No credential returned");
    }
    return { ok: true, response: registrationToJson(credential) };
  } catch (error) {
    return {
      ok: false,
      ...describeFailure(
        error,
        "Couldn't create a passkey on this device. Please try again."
      ),
    };
  }
}

export async function getPasskeyAssertion(
  options: PublicKeyCredentialRequestOptionsJSON
): Promise<PasskeyAssertionOutcome> {
  try {
    const credential = await navigator.credentials.get({
      publicKey: parseRequestOptions(options),
    });
    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error("No credential returned");
    }
    return { ok: true, response: assertionToJson(credential) };
  } catch (error) {
    return {
      ok: false,
      ...describeFailure(
        error,
        "Couldn't sign in with a passkey on this device. Please try again."
      ),
    };
  }
}
