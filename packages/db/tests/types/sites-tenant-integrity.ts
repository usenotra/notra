export interface IntegritySnapshot {
  prevId: string;
  tables: Record<
    string,
    {
      checkConstraints: Record<string, { name: string; value: string }>;
    }
  >;
}
