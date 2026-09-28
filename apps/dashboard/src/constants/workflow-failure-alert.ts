export const RELEASE_ABANDONED_WORKFLOW_ALERT = `
if redis.call("GET", KEYS[1]) == "pending"
  and redis.call("EXISTS", KEYS[2]) == 0
  and redis.call("TTL", KEYS[1]) < tonumber(ARGV[1]) then
  return redis.call("DEL", KEYS[1])
end
return 0
`;
