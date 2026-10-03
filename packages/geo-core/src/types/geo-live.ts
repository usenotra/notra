export type GeoVisibilityLiveStatus = "started" | "progress" | "finished";

export interface GeoTrafficSettleBatch {
  projectIds: Set<string>;
  lastEventAt: number;
  /** Resolves once this window was announced. */
  published: Promise<void>;
  /** Resolves once every event of the window was announced after it flushed. */
  done: Promise<void>;
}
