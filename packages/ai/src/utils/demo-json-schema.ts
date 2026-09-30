import {
  DEMO_FAKE_MAX_DEPTH,
  DEMO_FAKE_PARAGRAPHS,
  DEMO_FAKE_SENTENCES,
  DEMO_FAKE_TITLES,
} from "@notra/ai/constants/demo-responses";
import type {
  DemoFakeContext,
  DemoJsonSchema,
  DemoJsonSchemaDefinition,
} from "@notra/ai/types/demo-model";

const LONG_TEXT_KEY =
  /markdown|content|body|text|answer|summary|description|draft|html|article/i;
const TITLE_KEY = /title|headline|name|label|heading|subject/i;
const URL_KEY = /url|link|href|website|domain/i;
const SHORT_TEXT_KEY = /reason|rationale|explanation|note|why|comment|hint/i;

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) % 2_147_483_647;
  }
  return result;
}

function pick<T>(items: readonly T[], seed: string): T {
  return items[hash(seed) % items.length] as T;
}

function resolveRef(
  schema: DemoJsonSchema,
  root: DemoJsonSchema
): DemoJsonSchema {
  if (!schema.$ref) {
    return schema;
  }
  const path = schema.$ref.replace(/^#\//, "").split("/");
  let current: unknown = root;
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return {};
    }
  }
  return typeof current === "object" && current !== null
    ? (current as DemoJsonSchema)
    : {};
}

function clampText(value: string, schema: DemoJsonSchema): string {
  let text = value;
  if (schema.maxLength !== undefined && text.length > schema.maxLength) {
    text = text.slice(0, schema.maxLength);
  }
  while (schema.minLength !== undefined && text.length < schema.minLength) {
    text = `${text} ${text}`.slice(0, Math.max(schema.minLength, 1));
  }
  return text;
}

function fakeString(
  schema: DemoJsonSchema,
  key: string,
  context: DemoFakeContext
): string {
  const seed = `${context.seed}:${key}`;
  const language = context.german ? "de" : "en";
  switch (schema.format) {
    case "uri":
    case "url":
      return "https://www.fieldnote.example/blog/ai-meeting-notes-guide";
    case "email":
      return "hello@fieldnote.example";
    case "date-time":
      return new Date().toISOString();
    case "date":
      return new Date().toISOString().slice(0, 10);
    case "uuid":
      return crypto.randomUUID();
    default:
      break;
  }
  if (URL_KEY.test(key)) {
    return "https://www.fieldnote.example/blog/ai-meeting-notes-guide";
  }
  if (/slug/i.test(key)) {
    return "ai-meeting-notes-guide";
  }
  if (LONG_TEXT_KEY.test(key)) {
    return clampText(pick(DEMO_FAKE_PARAGRAPHS[language], seed), schema);
  }
  if (TITLE_KEY.test(key)) {
    return clampText(pick(DEMO_FAKE_TITLES[language], seed), schema);
  }
  if (SHORT_TEXT_KEY.test(key)) {
    return clampText(pick(DEMO_FAKE_SENTENCES[language], seed), schema);
  }
  return clampText("Fieldnote", schema);
}

function fakeNumber(schema: DemoJsonSchema, key: string, seed: string) {
  const min = schema.minimum ?? schema.exclusiveMinimum ?? 0;
  const max = schema.maximum ?? schema.exclusiveMaximum ?? Math.max(min, 100);
  const span = Math.max(0, max - min);
  const value = min + (hash(`${seed}:${key}`) % (Math.floor(span) + 1));
  return schema.type === "integer" ? Math.round(value) : value;
}

function firstNonNull(
  options: readonly DemoJsonSchemaDefinition[]
): DemoJsonSchemaDefinition | undefined {
  return (
    options.find(
      (option) => typeof option === "object" && option.type !== "null"
    ) ?? options[0]
  );
}

/**
 * Builds a value that satisfies a JSON schema (as produced by zod) so
 * structured-output calls in the demo return something the caller accepts.
 * Text fields get Fieldnote-flavoured copy based on the property name.
 */
export function fakeFromJsonSchema(
  definition: DemoJsonSchemaDefinition | undefined,
  key: string,
  context: DemoFakeContext
): unknown {
  if (definition === undefined || typeof definition === "boolean") {
    return null;
  }
  const schema = resolveRef(definition, context.root);
  const nested = { ...context, depth: context.depth + 1 };

  if (schema.const !== undefined) {
    return schema.const;
  }
  if (schema.enum && schema.enum.length > 0) {
    return pick(schema.enum, `${context.seed}:${key}`);
  }
  if (schema.default !== undefined) {
    return schema.default;
  }
  const union = schema.anyOf ?? schema.oneOf;
  if (union && union.length > 0) {
    return fakeFromJsonSchema(firstNonNull(union), key, nested);
  }
  if (schema.allOf && schema.allOf.length > 0) {
    return fakeFromJsonSchema(schema.allOf[0], key, nested);
  }

  const type = Array.isArray(schema.type)
    ? (schema.type.find((candidate) => candidate !== "null") ?? "null")
    : schema.type;

  switch (type) {
    case "string":
      return fakeString(schema, key, context);
    case "number":
    case "integer":
      return fakeNumber(schema, key, context.seed);
    case "boolean":
      return hash(`${context.seed}:${key}`) % 2 === 0;
    case "null":
      return null;
    case "array": {
      if (context.depth > DEMO_FAKE_MAX_DEPTH) {
        return [];
      }
      const count = Math.max(
        schema.minItems ?? 0,
        Math.min(schema.maxItems ?? 3, 3)
      );
      const items = Array.isArray(schema.items)
        ? schema.items[0]
        : schema.items;
      return Array.from({ length: count }, (_, index) =>
        fakeFromJsonSchema(items, `${key}${index}`, nested)
      );
    }
    default: {
      if (!schema.properties || context.depth > DEMO_FAKE_MAX_DEPTH) {
        return {};
      }
      const result: Record<string, unknown> = {};
      for (const [property, propertySchema] of Object.entries(
        schema.properties
      )) {
        result[property] = fakeFromJsonSchema(propertySchema, property, nested);
      }
      return result;
    }
  }
}
