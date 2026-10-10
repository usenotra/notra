import { defineConfig } from "oxlint";

// isolate Effect diagnostics from the monorepo's established lint baseline
export default defineConfig({
  plugins: ["effecttsgo"],
  options: { typeAware: true },
  categories: {
    correctness: "off",
    suspicious: "off",
    pedantic: "off",
    perf: "off",
    style: "off",
    restriction: "off",
    nursery: "off",
  },
  rules: {
    "effecttsgo/floating-effect": "error",
    "effecttsgo/missing-star-in-yield-effect-gen": "error",
    "effecttsgo/outdated-api": "error",
    "effecttsgo/return-effect-in-gen": "warn",
    "effecttsgo/effect-in-void-success": "warn",
    "effecttsgo/promise-in-effect-success": "warn",
    "effecttsgo/unsafe-effect-type-assertion": "warn",
    "effecttsgo/layer-merge-all-with-dependencies": "warn",
  },
});
