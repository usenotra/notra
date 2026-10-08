export const MS_PER_SECOND = 1000;
export const ESCAPE = String.fromCharCode(27);
export const ANSI_SEQUENCE = new RegExp(`${ESCAPE}\\[[0-9;?]*[A-Za-z]`, "g");
export const SECONDS_PER_MINUTE = 60;
