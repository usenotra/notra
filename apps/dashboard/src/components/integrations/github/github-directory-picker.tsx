"use client";

import {
  Add01Icon,
  ArrowRight01Icon,
  Folder01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { repositoryContentDirectorySchema } from "@notra/schemas/dashboard/integrations";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import { cn } from "@notra/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useId, useState } from "react";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubDirectoryChoiceProps,
  GitHubDirectoryExtraChoicesProps,
  GitHubDirectoryNewFolderFieldProps,
  GitHubDirectoryNodeProps,
  GitHubDirectoryNodesProps,
  GitHubDirectoryNodeStatusProps,
  GitHubDirectoryPickerProps,
  GitHubDirectoryRootContentProps,
} from "@/types/integrations/github";
import {
  isGitHubCurrentFolderMissing,
  joinGitHubDirectory,
  normalizeGitHubDirectorySegment,
} from "@/utils/github-directory";

function DirectoryChoice({
  depth,
  helper,
  name,
  path,
}: GitHubDirectoryChoiceProps) {
  const radioId = useId();

  return (
    <label
      className="hover:bg-muted/60 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg py-2 pe-2 text-sm"
      htmlFor={radioId}
      style={{ paddingInlineStart: `${depth * 16 + 12}px` }}
    >
      <RadioGroupItem id={radioId} value={path} />
      <HugeiconsIcon
        className="text-muted-foreground size-4 shrink-0"
        icon={Folder01Icon}
      />
      <span className="min-w-0">
        <span className="block truncate">{name}</span>
        {helper ? (
          <span className="text-muted-foreground block text-xs">{helper}</span>
        ) : null}
      </span>
    </label>
  );
}

function DirectoryNodes({
  depth,
  directories,
  excludedPath,
  open,
  organizationId,
  repositoryId,
}: GitHubDirectoryNodesProps) {
  const nodes: ReactNode[] = [];

  for (const directory of directories) {
    if (directory.path === excludedPath) {
      continue;
    }

    nodes.push(
      <DirectoryNode
        depth={depth}
        excludedPath={excludedPath}
        key={directory.path}
        name={directory.name}
        open={open}
        organizationId={organizationId}
        path={directory.path}
        repositoryId={repositoryId}
      />
    );
  }

  return nodes;
}

function ExtraDirectoryChoices({
  customDirectories,
  directory,
  rootDirectories,
}: GitHubDirectoryExtraChoicesProps) {
  const rootPaths = new Set<string>();
  for (const rootDirectory of rootDirectories) {
    rootPaths.add(rootDirectory.path);
  }

  const choices: ReactNode[] = [];
  for (const path of customDirectories) {
    if (path === "" || path === directory || rootPaths.has(path)) {
      continue;
    }

    choices.push(
      <DirectoryChoice
        depth={0}
        helper="This folder will be created when you publish."
        key={path}
        name={`${path} (new folder)`}
        path={path}
      />
    );
  }

  return choices;
}

function DirectoryNodeStatus({
  depth,
  exists,
  isError,
  isLoading,
}: GitHubDirectoryNodeStatusProps) {
  const paddingInlineStart = `${(depth + 1) * 16 + 44}px`;

  if (isLoading) {
    return (
      <output
        className="text-muted-foreground flex h-10 items-center gap-2 text-sm"
        style={{ paddingInlineStart }}
      >
        <HugeiconsIcon className="size-4 animate-spin" icon={Loading03Icon} />
        Loading…
      </output>
    );
  }

  if (exists === false) {
    return (
      <p
        className="text-muted-foreground py-2 text-sm"
        style={{ paddingInlineStart }}
      >
        This folder is not in the repository yet. It will be created when you
        publish.
      </p>
    );
  }

  if (isError) {
    return (
      <p
        className="text-destructive py-2 text-sm"
        role="alert"
        style={{ paddingInlineStart }}
      >
        Unable to load this folder.
      </p>
    );
  }

  return null;
}

function RootDirectoryContent({
  directory,
  isError,
  isLoading,
  open,
  organizationId,
  repositoryId,
  rootDirectories,
}: GitHubDirectoryRootContentProps) {
  if (isLoading) {
    return (
      <output className="text-muted-foreground flex h-20 items-center justify-center gap-2 text-sm">
        <HugeiconsIcon className="size-4 animate-spin" icon={Loading03Icon} />
        Loading folders…
      </output>
    );
  }

  if (isError) {
    return (
      <p
        className="text-destructive px-3 py-6 text-center text-sm"
        role="alert"
      >
        Unable to load repository folders.
      </p>
    );
  }

  return (
    <DirectoryNodes
      depth={0}
      directories={rootDirectories}
      excludedPath={directory}
      open={open}
      organizationId={organizationId}
      repositoryId={repositoryId}
    />
  );
}

function GitHubDirectoryNewFolderField({
  error,
  inputId,
  name,
  onNameChange,
  onSubmit,
  selectedDirectory,
}: GitHubDirectoryNewFolderFieldProps) {
  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={inputId}>New folder</FieldLabel>
        <div className="flex gap-2">
          <Input
            aria-invalid={Boolean(error)}
            autoComplete="off"
            className="w-auto min-w-0 flex-1"
            id={inputId}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={
              selectedDirectory
                ? `Folder inside ${selectedDirectory}`
                : "e.g. changelogs"
            }
            value={name}
          />
          <Button
            className="shrink-0"
            disabled={!normalizeGitHubDirectorySegment(name)}
            size="sm"
            type="submit"
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Add
          </Button>
        </div>
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription className="text-xs">
            Added relative to the selected folder. It does not need to exist in
            GitHub yet.
          </FieldDescription>
        )}
      </Field>
    </form>
  );
}

function DirectoryNode({
  depth,
  excludedPath,
  missing = false,
  name,
  open,
  organizationId,
  path,
  repositoryId,
}: GitHubDirectoryNodeProps) {
  const radioId = useId();
  const [expanded, setExpanded] = useState(false);
  const directoriesQuery = useQuery(
    dashboardOrpc.integrations.repositories.directories.list.queryOptions({
      input: { organizationId, repositoryId, directory: path },
      enabled: open && expanded && !missing,
      staleTime: 5 * 60 * 1000,
    })
  );

  if (missing) {
    return (
      <DirectoryChoice
        depth={depth}
        helper="This folder is not in the repository yet. It will be created when you publish."
        name={name}
        path={path}
      />
    );
  }

  const directoryContent =
    directoriesQuery.isLoading ||
    directoriesQuery.data?.exists === false ||
    directoriesQuery.isError ? (
      <DirectoryNodeStatus
        depth={depth}
        exists={directoriesQuery.data?.exists}
        isError={directoriesQuery.isError}
        isLoading={directoriesQuery.isLoading}
      />
    ) : (
      <DirectoryNodes
        depth={depth + 1}
        directories={directoriesQuery.data?.directories ?? []}
        excludedPath={excludedPath}
        open={open}
        organizationId={organizationId}
        repositoryId={repositoryId}
      />
    );

  return (
    <Collapsible onOpenChange={setExpanded} open={expanded}>
      <div
        className="hover:bg-muted/60 flex min-h-10 items-center gap-1 rounded-lg pe-2"
        style={{ paddingInlineStart: `${depth * 16 + 4}px` }}
      >
        <CollapsibleTrigger
          aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-1"
        >
          <HugeiconsIcon
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-90"
            )}
            icon={ArrowRight01Icon}
          />
        </CollapsibleTrigger>
        <label
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-sm"
          htmlFor={radioId}
        >
          <RadioGroupItem id={radioId} value={path} />
          <HugeiconsIcon
            className="text-muted-foreground size-4 shrink-0"
            icon={Folder01Icon}
          />
          <span className="truncate">{name}</span>
        </label>
      </div>

      <CollapsibleContent>{directoryContent}</CollapsibleContent>
    </Collapsible>
  );
}

export function GitHubDirectoryPicker({
  contentLabel,
  directory,
  disabled = false,
  isSaving = false,
  onSave,
  organizationId,
  repositoryId,
  repositoryName,
  triggerId,
}: GitHubDirectoryPickerProps) {
  const rootRadioId = useId();
  const newFolderInputId = useId();
  const [open, setOpen] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState(directory);
  const [customDirectories, setCustomDirectories] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState<string | null>(null);
  const rootDirectoriesQuery = useQuery(
    dashboardOrpc.integrations.repositories.directories.list.queryOptions({
      input: { organizationId, repositoryId, directory: "" },
      enabled: open && Boolean(repositoryId),
      staleTime: 5 * 60 * 1000,
    })
  );
  const rootDirectories = rootDirectoriesQuery.data?.directories ?? [];
  const currentFolderMissing = isGitHubCurrentFolderMissing(
    directory,
    rootDirectories,
    rootDirectoriesQuery.isSuccess
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving) {
      return;
    }
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedDirectory(directory);
      setCustomDirectories([]);
      setNewFolderName("");
      setNewFolderError(null);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(selectedDirectory);
      handleOpenChange(false);
    } catch {
      // The parent mutation keeps the dialog open and surfaces the error.
    }
  };

  const handleCreateFolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const folderName = normalizeGitHubDirectorySegment(newFolderName);
    if (!folderName) {
      setNewFolderError("Enter a folder name");
      return;
    }

    const nextDirectory = joinGitHubDirectory(selectedDirectory, folderName);
    const parsed = repositoryContentDirectorySchema.safeParse(nextDirectory);
    if (!parsed.success) {
      setNewFolderError(
        parsed.error.issues[0]?.message ?? "Enter a valid folder path"
      );
      return;
    }

    setSelectedDirectory(parsed.data);
    setCustomDirectories((current) =>
      current.includes(parsed.data) ? current : [...current, parsed.data]
    );
    setNewFolderName("");
    setNewFolderError(null);
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger
        render={
          <Button
            aria-label={`${contentLabel} folder: ${directory || "Repository root"}. Browse folders`}
            className="bg-background text-muted-foreground h-10 w-full justify-between gap-3 rounded-lg border px-3 font-normal shadow-none"
            disabled={disabled}
            id={triggerId}
            type="button"
            variant="outline"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <HugeiconsIcon
            className="text-muted-foreground size-4 shrink-0"
            icon={Folder01Icon}
          />
          <span className="truncate font-mono text-xs">
            {directory || "Repository root"}
          </span>
        </span>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="sm:max-w-[600px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Choose {contentLabel.toLowerCase()} folder
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {repositoryName}. Missing folders are created when you publish.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <RadioGroup
          aria-label={`${contentLabel} folder`}
          className="my-4 max-h-[420px] gap-0 overflow-y-auto rounded-xl border p-1"
          onValueChange={(value) => {
            if (typeof value === "string") {
              setSelectedDirectory(value);
              setNewFolderError(null);
            }
          }}
          value={selectedDirectory}
        >
          <label
            className="hover:bg-muted/60 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm"
            htmlFor={rootRadioId}
          >
            <RadioGroupItem id={rootRadioId} value="" />
            <HugeiconsIcon
              className="text-muted-foreground size-4 shrink-0"
              icon={Folder01Icon}
            />
            <span>{repositoryName} (root)</span>
          </label>

          {directory ? (
            <DirectoryNode
              depth={0}
              excludedPath={directory}
              missing={currentFolderMissing}
              name={`${directory} (current folder)`}
              open={open}
              organizationId={organizationId}
              path={directory}
              repositoryId={repositoryId}
            />
          ) : null}

          <ExtraDirectoryChoices
            customDirectories={customDirectories}
            directory={directory}
            rootDirectories={rootDirectories}
          />

          <RootDirectoryContent
            directory={directory}
            isError={rootDirectoriesQuery.isError}
            isLoading={rootDirectoriesQuery.isLoading}
            open={open}
            organizationId={organizationId}
            repositoryId={repositoryId}
            rootDirectories={rootDirectories}
          />
        </RadioGroup>

        <GitHubDirectoryNewFolderField
          error={newFolderError}
          inputId={newFolderInputId}
          name={newFolderName}
          onNameChange={(value) => {
            setNewFolderName(value);
            if (newFolderError) {
              setNewFolderError(null);
            }
          }}
          onSubmit={handleCreateFolder}
          selectedDirectory={selectedDirectory}
        />

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose
            disabled={isSaving}
            render={<Button type="button" variant="outline" />}
          >
            Cancel
          </ResponsiveDialogClose>
          <Button disabled={isSaving} onClick={handleSave} type="button">
            {isSaving ? "Saving…" : "Use folder"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
