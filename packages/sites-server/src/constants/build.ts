import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";

export const BOX_WORKDIR = "/workspace/home";
export const BOX_TTL_SECONDS = SITE_BUILD_LIMITS.buildTimeoutSeconds + 5 * 60;
export const BUILD_LOG_POLL_MS = 2000;
/** Exit code of coreutils `timeout` when it stops the compile step. */
export const BUILD_TIMEOUT_EXIT_CODE = 124;
export const UPLOAD_CONCURRENCY = 16;
export const TAR_BLOCK_SIZE = 512;
