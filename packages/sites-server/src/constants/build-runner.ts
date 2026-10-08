export const GUEST_BUILD_RUNNER = String.raw`
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const [sourceDir, timeoutSeconds] = process.argv.slice(1);
const phases = {};
const log = fs.openSync('build.log', 'a');
function readNumber(path, key, divisor = 1) {
  try {
    const text = fs.readFileSync(path, 'utf8').trim();
    const value = Number(key ? text.split('\n').find(line => line.startsWith(key + ' '))?.split(/\s+/)[1] : text);
    return Number.isFinite(value) && value >= 0 ? value / divisor : null;
  } catch { return null; }
}
function cpu() {
  return readNumber('/sys/fs/cgroup/cpu.stat', 'usage_usec', 1000)
    ?? readNumber('/sys/fs/cgroup/cpuacct/cpuacct.usage', null, 1000000);
}
function run(phase, command, args, options = {}) {
  const start = performance.now();
  try {
    const result = spawnSync(command, args, { stdio: ['ignore', log, log], ...options });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } finally { phases[phase] = performance.now() - start; }
}
const cpuStart = cpu();
let exitCode = 3;
try {
  if (run('extract', 'tar', ['xzf', 'source.tgz', '-C', 'src', '--strip-components=1', '--no-same-owner', '--no-same-permissions']) !== 0) process.exitCode = 3;
  else {
    fs.unlinkSync('source.tgz');
    exitCode = run('compile', 'timeout', [timeoutSeconds, 'node', 'dist/cli.mjs', 'build', '--source', sourceDir, '--target', '../target.json', '--out', '../out', '--result-file', '../result.json'], { cwd: 'toolchain' });
    if (fs.existsSync('out') && run('pack', 'tar', ['czf', 'out.tgz', '-C', 'out', '.']) !== 0) throw new Error('Packing build output failed');
  }
} catch (error) {
  exitCode = 3;
  fs.appendFileSync('build.log', '\nBuild runner: ' + String(error) + '\n');
  process.exitCode = 3;
} finally {
  fs.closeSync(log);
  fs.writeFileSync('exit-code', String(exitCode));
  const cpuEnd = cpu();
  fs.writeFileSync('build-metrics.json', JSON.stringify({
    phases,
    sandboxCpuTimeMs: cpuStart !== null && cpuEnd !== null ? Math.max(0, cpuEnd - cpuStart) : null,
    sandboxMemoryPeakBytes: readNumber('/sys/fs/cgroup/memory.peak') ?? readNumber('/sys/fs/cgroup/memory/memory.max_usage_in_bytes')
  }));
  console.log('exit=' + exitCode);
}
`;
