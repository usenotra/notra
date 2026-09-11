export const PERSONA_GENERATION_JOB_TTL_SECONDS = 7 * 24 * 60 * 60;
export const PERSONA_GENERATION_POLL_MS = 3000;
export const PERSONA_GENERATION_START_TIMEOUT_MS = 5 * 60 * 1000;
export const PERSONA_GENERATION_FAILED_MESSAGE =
  "Persona generation failed. Please try again.";

export const CLAIM_PERSONA_GENERATION_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then
  local job = cjson.decode(current)
  if job.status == 'queued' or job.status == 'running' then
    return current
  end
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
return ARGV[1]
`;

export const UPDATE_PERSONA_GENERATION_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local job = cjson.decode(current)
if job.id ~= ARGV[1] then return 0 end
if job.status == 'completed' or job.status == 'failed' then return 0 end
if ARGV[4] == '1' and (job.status ~= 'queued' or (job.runId ~= nil and job.runId ~= cjson.null)) then return 0 end
local patch = cjson.decode(ARGV[2])
for key, value in pairs(patch) do job[key] = value end
redis.call('SET', KEYS[1], cjson.encode(job), 'EX', ARGV[3])
return 1
`;
