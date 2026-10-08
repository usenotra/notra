export interface AcornSyntaxError {
  message: string;
  offset: number;
}

export interface MicromarkErrorPlace {
  line?: number;
  column?: number;
  start?: { line: number; column: number };
}
