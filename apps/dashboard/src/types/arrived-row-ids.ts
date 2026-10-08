export interface ArrivedRowIdsInput {
  /** Row ids of the page on screen, in table order. */
  ids: readonly string[];
  /** Identifies page, filter and source; a change is not an arrival. */
  viewKey: string;
  /** False while `ids` are placeholder rows of the previous view. */
  ready: boolean;
  /** Rows only count as arrivals while the table is live. */
  enabled: boolean;
}

export interface ArrivedRowIdsState {
  viewKey: string;
  known: ReadonlySet<string>;
  /** Row id to its stagger slot within the batch it arrived with. */
  arrived: ReadonlyMap<string, number>;
}
