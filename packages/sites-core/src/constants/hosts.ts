export const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
export const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const PREVIEW_KEY = /^(?:pr|br)-[a-z0-9-]+$/;
export const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
export const EDGE_DASHES = /^-|-$/g;
export const COMBINING_MARKS = /[\u0300-\u036f]/g;
