import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { ModuleDeclaration } from "estree";
import type { RootContent } from "mdast";

import type { SourceRange } from "./estree";

export interface BlankedFrontmatter {
  text: string;
  length: number;
}

export interface TextEdit extends SourceRange {
  text: string;
}

export interface MdxAnalysisContext {
  files: ReadonlySet<string>;
  componentExports: ReadonlyMap<string, readonly string[]>;
  isEntry: boolean;
}

export interface InlineModule {
  path: string;
  source: string;
}

export interface MdxAnalysis {
  diagnostics: SiteDiagnostic[];
  output: string | null;
  inlineModule: InlineModule | null;
  imports: string[];
}

export type EsmNode = Extract<RootContent, { type: "mdxjsEsm" }>;

export type MdxJsxElement = Extract<
  RootContent,
  { type: "mdxJsxFlowElement" | "mdxJsxTextElement" }
>;

export type MdxJsxAttribute = Extract<
  MdxJsxElement["attributes"][number],
  { type: "mdxJsxAttribute" }
>;

export interface MdxPass {
  path: string;
  source: string;
  text: string;
  context: MdxAnalysisContext;
  diagnostics: SiteDiagnostic[];
  edits: TextEdit[];
}

export interface InlineComponent {
  names: string[];
  source: string;
  node: ModuleDeclaration;
  start: number;
}

export interface ModuleScan {
  imports: string[];
  importedNames: Set<string>;
  exportedNames: Set<string>;
  hydrated: Set<string>;
  contentComponents: Set<string>;
  inline: InlineComponent[];
  valueExports: string[];
}
