import type { Context } from "hono";

type TaggedError = { readonly _tag: string };

export interface HttpErrorResponse {
  readonly status: number;
  readonly body: { readonly error: string };
}

export type TaggedErrorMapper<E extends TaggedError> = (
  error: E
) => HttpErrorResponse | null;

/**
 * Resolve the first mapper that recognizes a tagged domain error.
 */
export function mapTaggedError<E extends TaggedError>(
  error: E,
  mappers: ReadonlyArray<TaggedErrorMapper<E>>
): HttpErrorResponse | null {
  for (const mapper of mappers) {
    const response = mapper(error);
    if (response) {
      return response;
    }
  }
  return null;
}

/** Write a mapped domain error as a JSON HTTP response. */
export function respondWithMappedError(c: Context, mapped: HttpErrorResponse) {
  return c.json(mapped.body, mapped.status as ContentfulStatusCode);
}

type ContentfulStatusCode = Parameters<Context["json"]>[1];
