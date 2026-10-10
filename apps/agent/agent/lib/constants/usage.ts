export const USAGE_KEY_TTL_SECONDS = 60 * 60 * 24;
export const MICRO_USD_PER_USD = 1_000_000;

// Lua errors do not roll back. Validate every bucket and command argument
// before the first write, then replace all totals with a single HSET.
export const ACCUMULATE_USAGE_SCRIPT = `
local maxInteger = 9007199254740991
local function integer(value)
  if not value or (value ~= '0' and not string.match(value, '^[1-9]%d*$')) then
    error('invalid usage integer')
  end
  local number = tonumber(value)
  if not number or number > maxInteger then
    error('usage integer exceeds safe range')
  end
  return number
end
if #KEYS ~= 4 or #ARGV ~= 6 then
  error('invalid usage keys or arguments')
end
local types = {'string', 'hash', 'hash', 'string'}
for i = 1, #KEYS do
  if KEYS[i] == '' then error('empty usage key') end
  for j = 1, i - 1 do
    if KEYS[i] == KEYS[j] then error('usage keys must be distinct') end
  end
  local kind = redis.call('TYPE', KEYS[i]).ok
  if kind ~= 'none' and kind ~= types[i] then error('wrong usage key type') end
end
local ttl = integer(ARGV[6])
if ttl < 1 or ttl > 2147483647 then error('invalid usage TTL') end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 0
end
local fields = {'inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'costMicroUsd'}
local totals = {}
for i, field in ipairs(fields) do
  local increment = integer(ARGV[i])
  local current = integer(redis.call('HGET', KEYS[2], field) or '0')
  if increment > maxInteger - current then error('usage total exceeds safe range') end
  totals[#totals + 1] = field
  totals[#totals + 1] = string.format('%.0f', current + increment)
end
local settling = redis.call('EXISTS', KEYS[3], KEYS[4]) > 0
redis.call('HSET', KEYS[2], unpack(totals))
if settling then
  -- A RENAME freezes the billing hash. A racing later step recreates the
  -- live accumulator; retain that evidence rather than expiring it away.
  redis.call('PERSIST', KEYS[2])
else
  redis.call('EXPIRE', KEYS[2], ARGV[6])
end
redis.call('SET', KEYS[1], '1', 'EX', ARGV[6])
if settling then return 2 end
return 1
`;
