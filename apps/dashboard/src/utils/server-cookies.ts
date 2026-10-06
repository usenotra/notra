import { getCookie } from "@tanstack/react-start/server";

export function readServerCookies() {
  return {
    get(name: string) {
      const value = getCookie(name);
      return value === undefined ? undefined : { name, value };
    },
  };
}
