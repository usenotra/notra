import { Schema } from "effect";

export class McpUnauthorizedError extends Schema.TaggedError<McpUnauthorizedError>()(
  "McpUnauthorizedError",
  {
    message: Schema.String,
    statusCode: Schema.Literal(401),
  }
) {
  constructor() {
    super({
      message: "The MCP server rejected the access token.",
      statusCode: 401,
    });
  }
}
