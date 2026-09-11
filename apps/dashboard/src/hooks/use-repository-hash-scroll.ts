import { useEffect, useRef } from "react";

export function useRepositoryHashScroll(data: unknown) {
  const lastScrolled = useRef("");
  useEffect(() => {
    const scrollToRepository = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#repository-") || lastScrolled.current === hash) {
        return;
      }
      let id: string;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch {
        return;
      }
      const target = document.getElementById(id);
      if (!target) {
        return;
      }
      target.scrollIntoView({ block: "start" });
      lastScrolled.current = hash;
    };
    const onHashChange = () => {
      lastScrolled.current = "";
      scrollToRepository();
    };
    scrollToRepository();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [data]);
}
