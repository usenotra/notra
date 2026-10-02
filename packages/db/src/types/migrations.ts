export interface MigrationJournal {
  entries: {
    idx: number;
    tag: string;
    when: number;
  }[];
}
