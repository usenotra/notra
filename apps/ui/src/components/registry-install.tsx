import {
  CodeBlockCommand,
  convertNpmCommand,
} from "@/components/code-block-command";

import type { RegistryInstallProps } from "../types/registry-install";

export default function RegistryInstall({ name }: RegistryInstallProps) {
  return (
    <div className="my-6">
      <CodeBlockCommand
        {...convertNpmCommand(`npx shadcn@latest add @notra/${name}`)}
      />
    </div>
  );
}
