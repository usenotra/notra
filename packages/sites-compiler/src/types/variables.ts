export interface UnknownVariable {
  name: string;
  offset: number;
}

export interface VariableSubstitution {
  text: string;
  unknown: UnknownVariable[];
}

export interface TextSegment {
  start: number;
  end: number;
  code: boolean;
}

export interface SettingSubstitution {
  text: string;
  unknown: string[];
}
