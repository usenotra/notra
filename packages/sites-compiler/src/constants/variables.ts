export const VARIABLE_OR_CODE_SPAN =
  /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|(?<![=\\])\{\{\s*([A-Za-z][A-Za-z0-9_-]*)\s*\}\}/g;

export const CODE_FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
export const CODE_FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

export const VARIABLE_REFERENCE = /\{\{\s*([A-Za-z][A-Za-z0-9_-]*)\s*\}\}/g;

export const YAML_SAFE_VALUE = /^[^"'\n#:{}[\]&*!|>%@`\\]*$/;
