export interface PersonaScanSelection {
  personaId: string;
  scanId: string;
}

export interface PersonaActivitySeries {
  personaId: string;
  snapshotVersion: string;
  dataKey: string;
  label: string;
  isCurrent: boolean;
}
