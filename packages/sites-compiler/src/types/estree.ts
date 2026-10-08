export interface SourceRange {
  start: number;
  end: number;
}

export interface ForbiddenSyntax {
  message: string;
  start: number;
}

export interface IdentifierReference {
  name: string;
  start: number;
  end: number;
  shorthand?: boolean;
}

export interface JsxReferenceNode extends Partial<SourceRange> {
  type: string;
  name?: string;
}
