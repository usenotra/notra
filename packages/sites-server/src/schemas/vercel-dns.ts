import { Schema } from "effect";

export const VercelTokenResponse = Schema.Struct({
  access_token: Schema.NonEmptyString,
  installation_id: Schema.NonEmptyString,
  team_id: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
