export const GITHUB_MENTION_DELIVERY_TTL_SECONDS = 24 * 60 * 60;

// An unfinished owner does not expire: delayed workflows must not lose their
// claim to another run. A same-owner retry covers a lost step checkpoint.
export const CLAIM_GITHUB_MENTION_DELIVERY = `
local owner = redis.call("GET", KEYS[1])
if not owner then
  redis.call("SET", KEYS[1], ARGV[1])
  return 1
end
if owner == ARGV[1] then return 1 end
return 0
`;

export const COMPLETE_GITHUB_MENTION_DELIVERY = `
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("SET", KEYS[1], "completed:" .. ARGV[1], "EX", ARGV[2])
return 1
`;
