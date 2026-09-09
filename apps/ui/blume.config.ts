import { defineConfig } from "blume";

export default defineConfig({
  description: "Notra UI package showcase, powered by Blume.",
  logo: {
    image: {
      alt: "Notra logo",
      dark: "/logo.svg",
      light: "/logo.svg",
    },
    text: "Notra UI",
  },
  seo: {
    og: {
      enabled: true,
      logo: "public/logo.svg",
    },
  },
  title: "Notra UI",
});
