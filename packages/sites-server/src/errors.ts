/**
 * A build problem that will happen again on every retry (oversized or unsafe
 * output, repository too large, repository disconnected). The job fails at
 * once instead of burning more sandbox builds.
 */
export class SitePermanentBuildError extends Error {
  readonly name = "SitePermanentBuildError";
}
