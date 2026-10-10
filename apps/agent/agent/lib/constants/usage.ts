export const USAGE_KEY_TTL_SECONDS = 60 * 60 * 24;
export const MICRO_USD_PER_USD = 1_000_000;

// One command commits the dedupe marker, all buckets and both expirations.
export const ACCUMULATE_USAGE_SCRIPT = `
if not redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[6]) then
  return 0
end
redis.call('HINCRBY', KEYS[2], 'inputTokens', ARGV[1])
redis.call('HINCRBY', KEYS[2], 'outputTokens', ARGV[2])
redis.call('HINCRBY', KEYS[2], 'cacheReadTokens', ARGV[3])
redis.call('HINCRBY', KEYS[2], 'cacheWriteTokens', ARGV[4])
redis.call('HINCRBY', KEYS[2], 'costMicroUsd', ARGV[5])
redis.call('EXPIRE', KEYS[2], ARGV[6])
return 1
`;
