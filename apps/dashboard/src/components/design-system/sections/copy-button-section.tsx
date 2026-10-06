"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { CopyButton, CopyStateIcon } from "@notra/ui/components/ui/copy-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";

import { Button } from "@/components/button";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

const SAMPLE_API_KEY = "ntr_live_4f9c2a7e81d0b3";
const SAMPLE_COMMAND = "npx @notra/cli init";

function DemoLabel({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  );
}

export function CopyButtonSection() {
  return (
    <section className="scroll-mt-10 space-y-6" id="copy-button">
      <DesignSystemSectionHeader
        description="Shared copy action from @notra/ui. The icon turns into a tick for two seconds; errors go to onCopyError so the caller decides how to report them."
        id="copy-button"
        title="Copy Button"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Icon only</CardTitle>
            <CardDescription>
              Ghost by default. The accessible name comes from the UI labels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <CopyButton size="icon-xs" value={SAMPLE_COMMAND} />
              <CopyButton value={SAMPLE_COMMAND} />
              <CopyButton
                size="icon"
                value={SAMPLE_COMMAND}
                variant="outline"
              />
              <CopyButton
                size="icon-lg"
                value={SAMPLE_COMMAND}
                variant="secondary"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>With label</CardTitle>
            <CardDescription>
              Pass children for a label, and copiedLabel to swap it in place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <CopyButton value={SAMPLE_COMMAND} variant="outline">
                Copy command
              </CopyButton>
              <CopyButton
                copiedLabel="Copied"
                value={SAMPLE_COMMAND}
                variant="default"
              >
                Copy prompt
              </CopyButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>In an input group</CardTitle>
            <CardDescription>
              Read-only values like API keys and install commands.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <InputGroup>
                <InputGroupInput
                  aria-label="API key"
                  readOnly
                  value={SAMPLE_API_KEY}
                />
                <InputGroupAddon align="inline-end">
                  <CopyButton
                    aria-label="Copy API key"
                    size="icon-xs"
                    value={SAMPLE_API_KEY}
                  />
                </InputGroupAddon>
              </InputGroup>
              <InputGroup>
                <InputGroupInput
                  aria-label="Install command"
                  readOnly
                  value={SAMPLE_COMMAND}
                />
                <InputGroupAddon align="inline-end">
                  <CopyButton size="xs" value={SAMPLE_COMMAND}>
                    Copy
                  </CopyButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copied state</CardTitle>
            <CardDescription>
              Frozen with CopyStateIcon, which also works inside your own
              trigger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <DemoLabel>Idle</DemoLabel>
                <div className="flex items-center gap-3">
                  <Button aria-label="Copy" size="icon-sm" variant="ghost">
                    <CopyStateIcon copied={false} />
                  </Button>
                  <Button size="sm" variant="outline">
                    <CopyStateIcon copied={false} />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <DemoLabel>Copied</DemoLabel>
                <div className="flex items-center gap-3">
                  <Button aria-label="Copied" size="icon-sm" variant="ghost">
                    <CopyStateIcon copied />
                  </Button>
                  <Button size="sm" variant="outline">
                    <CopyStateIcon copied />
                    Copied
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
