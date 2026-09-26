"use client";

import {
  Add01Icon,
  Delete02Icon,
  Dots,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { API_KEY_DEFAULT_SCOPES } from "@notra/schemas/constants/dashboard/api-keys";
import type {
  CreateApiKeyInput,
  UpdateApiKeyInput,
} from "@notra/schemas/dashboard/api-keys";
import {
  createApiKeySchema,
  updateApiKeySchema,
} from "@notra/schemas/dashboard/api-keys";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Alert, AlertDescription } from "@notra/ui/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ApiKeyRevealField } from "@/components/api-keys/api-key-reveal-field";
import { ApiKeyPermissionSelector } from "@/components/api-keys/permission-selector";
import { Button } from "@/components/button";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  API_KEY_EXPIRATION_OPTIONS,
  API_KEY_PERMISSION_SUMMARY,
} from "@/constants/api-keys";
import { expandLegacyApiKeyScopes } from "@/lib/api-keys/scopes";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ApiKeyAccessMode, ApiKeyExpiration } from "@/types/api-keys";

interface AccountKeyItem {
  keyId: string;
  name: string;
  start: string;
  createdAt: number;
  expires: number | null;
  enabled: boolean;
  accessMode: ApiKeyAccessMode;
  permission: keyof typeof API_KEY_PERMISSION_SUMMARY;
  permissions: string[];
  createdBy: string | null;
  accountWide: boolean;
}

function formatExpiry(expires: number | null) {
  if (!expires) {
    return "Never";
  }
  if (new Date(expires).getTime() < Date.now()) {
    return "Expired";
  }
  return new Date(expires).toLocaleDateString();
}

function getAccountEditExpiration(
  createdAt: number,
  expires: number | null
): ApiKeyExpiration {
  if (expires === null) {
    return "never";
  }
  const ttl = Math.max(0, expires - createdAt);
  const day = 24 * 60 * 60 * 1000;
  if (ttl <= 7 * day) {
    return "7d";
  }
  if (ttl <= 30 * day) {
    return "30d";
  }
  if (ttl <= 60 * day) {
    return "60d";
  }
  return "90d";
}

export function AccountApiKeysSection() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accessMode, setAccessMode] = useState<ApiKeyAccessMode>("restricted");
  const [scopes, setScopes] = useState<string[]>([...API_KEY_DEFAULT_SCOPES]);
  const [expiration, setExpiration] = useState<ApiKeyExpiration>("30d");
  const [editingKey, setEditingKey] = useState<AccountKeyItem | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    accessMode: "restricted" as ApiKeyAccessMode,
    scopes: [] as string[],
    expiration: "never" as ApiKeyExpiration,
  });
  const [deletingKey, setDeletingKey] = useState<AccountKeyItem | null>(null);

  const accountListKey = dashboardOrpc.apiKeys.account.list.queryKey();
  const { data: keys = [], isPending } = useQuery<AccountKeyItem[]>({
    ...dashboardOrpc.apiKeys.account.list.queryOptions(),
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateApiKeyInput) =>
      dashboardOrpc.apiKeys.account.create.call(values),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: accountListKey });
      toast.success("Account API key created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UpdateApiKeyInput) =>
      dashboardOrpc.apiKeys.account.update.call({
        keyIdParam: values.keyId,
        payload: values,
      }),
    onSuccess: () => {
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: accountListKey });
      toast.success("Account API key updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) =>
      dashboardOrpc.apiKeys.account.delete.call({
        keyIdParam: keyId,
        payload: { keyId },
      }),
    onSuccess: () => {
      setDeletingKey(null);
      queryClient.invalidateQueries({ queryKey: accountListKey });
      toast.success("Account API key deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetCreateForm = () => {
    setName("");
    setAccessMode("restricted");
    setScopes([...API_KEY_DEFAULT_SCOPES]);
    setExpiration("30d");
  };

  const handleCreateSubmit = () => {
    const result = createApiKeySchema.safeParse({
      name,
      accessMode,
      scopes,
      expiration,
    });
    if (!result.success) {
      setCreateError(result.error.issues[0]?.message ?? "Invalid API key");
      return;
    }
    setCreateError(null);
    createMutation.mutate(result.data);
  };

  const openEditDialog = (key: AccountKeyItem) => {
    setEditValues({
      name: key.name,
      accessMode: key.accessMode,
      scopes: expandLegacyApiKeyScopes(key.permissions),
      expiration: getAccountEditExpiration(key.createdAt, key.expires),
    });
    setEditingKey(key);
  };

  const handleEditSubmit = () => {
    if (!editingKey) {
      return;
    }
    const result = updateApiKeySchema.safeParse({
      keyId: editingKey.keyId,
      ...editValues,
    });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid API key");
      return;
    }
    updateMutation.mutate(result.data);
  };

  const columns: TableColumn<AccountKeyItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "1fr",
      minWidth: "10rem",
      cell: (key) => <span className="font-medium">{key.name}</span>,
    },
    {
      key: "start",
      header: "Key",
      width: "1fr",
      minWidth: "9rem",
      cell: (key) => (
        <span className="text-muted-foreground font-mono text-sm">
          {key.start}…
        </span>
      ),
    },
    {
      key: "permission",
      header: "Permission",
      width: "1fr",
      minWidth: "9rem",
      cell: (key) => API_KEY_PERMISSION_SUMMARY[key.permission],
    },
    {
      key: "expires",
      header: "Expires",
      width: "8.75rem",
      cell: (key) => (
        <span className="text-muted-foreground text-sm">
          {formatExpiry(key.expires)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "4rem",
      minWidth: "4rem",
      cell: (key) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${key.name}`}
                size="icon"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={Dots} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openEditDialog(key)}>
                <HugeiconsIcon className="size-4" icon={Edit02Icon} />
                Edit API key
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeletingKey(key)}
                variant="destructive"
              >
                <HugeiconsIcon className="size-4" icon={Delete02Icon} />
                Delete API key
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Account API keys
          </h2>
          <p className="text-muted-foreground text-sm">
            One credential that works across every organization you belong to.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <HugeiconsIcon className="size-4" icon={Add01Icon} />
          Create account key
        </Button>
      </div>

      <Alert variant="info">
        <AlertDescription>
          One key for every organization you belong to. Send{" "}
          <span className="font-mono">X-Notra-Organization-Id</span> to choose a
          workspace. Best for personal automation — use organization keys for
          shared systems.
        </AlertDescription>
      </Alert>

      <Table
        columns={columns}
        data={keys}
        emptyState="No account API keys yet"
        getRowId={(key) => key.keyId}
        height={(Math.max(isPending ? 3 : keys.length, 1) + 1) * 48}
        loading={isPending}
        rowHeight={48}
      />

      <ResponsiveDialog
        onOpenChange={(open) => {
          if (!open && createMutation.isPending) {
            return;
          }
          setDialogOpen(open);
          if (!open) {
            setCreatedKey(null);
            setCreateError(null);
            resetCreateForm();
          }
        }}
        open={dialogOpen}
      >
        <ResponsiveDialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {createdKey ? (
            <>
              <ResponsiveDialogHeader className="shrink-0">
                <ResponsiveDialogTitle>
                  View account API key
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <div className="space-y-4 p-4">
                <Alert variant="info">
                  <AlertDescription>
                    You can only see this key once.{" "}
                    <span className="text-foreground font-medium">
                      Store it safely.
                    </span>
                  </AlertDescription>
                </Alert>
                <Field>
                  <FieldLabel>API Key</FieldLabel>
                  <ApiKeyRevealField value={createdKey} />
                </Field>
              </div>
              <ResponsiveDialogFooter>
                <ResponsiveDialogClose render={<Button>Done</Button>} />
              </ResponsiveDialogFooter>
            </>
          ) : (
            <form
              action={handleCreateSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
                <ResponsiveDialogTitle className="text-2xl">
                  Create account API key
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <Field className="shrink-0">
                  <FieldLabel>
                    Name<span className="text-destructive -ml-1">*</span>
                  </FieldLabel>
                  <Input
                    disabled={createMutation.isPending}
                    onChange={(event) => {
                      setCreateError(null);
                      setName(event.target.value);
                    }}
                    placeholder="e.g. Personal automation"
                    value={name}
                  />
                  {createError ? (
                    <p className="text-destructive text-sm">{createError}</p>
                  ) : null}
                </Field>
                <Field className="shrink-0">
                  <FieldLabel>Expiration</FieldLabel>
                  <Select
                    disabled={createMutation.isPending}
                    onValueChange={(value) =>
                      setExpiration(value as ApiKeyExpiration)
                    }
                    value={expiration}
                  >
                    <SelectTrigger>
                      <SelectValue className="capitalize" />
                    </SelectTrigger>
                    <SelectContent>
                      {API_KEY_EXPIRATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <FieldLabel>
                    Permissions
                    <span className="text-destructive -ml-1">*</span>
                  </FieldLabel>
                  <ApiKeyPermissionSelector
                    accessMode={accessMode}
                    disabled={createMutation.isPending}
                    onAccessModeChange={(mode, nextScopes) => {
                      setAccessMode(mode);
                      setScopes(nextScopes);
                    }}
                    onValueChange={setScopes}
                    value={scopes}
                  />
                </Field>
              </div>
              <ResponsiveDialogFooter className="bg-background/95 supports-backdrop-filter:bg-background/80 mx-0 mb-0 shrink-0 rounded-b-xl border-t p-4 sm:justify-between">
                <ResponsiveDialogClose
                  disabled={createMutation.isPending}
                  render={<Button variant="outline">Cancel</Button>}
                />
                <Button disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? "Creating…" : "Create Key"}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) {
            setEditingKey(null);
          }
        }}
        open={!!editingKey}
      >
        <ResponsiveDialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <form
            action={handleEditSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
              <ResponsiveDialogTitle className="text-2xl">
                Edit account API key
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
              <Field className="shrink-0">
                <FieldLabel>
                  Name<span className="text-destructive -ml-1">*</span>
                </FieldLabel>
                <Input
                  disabled={updateMutation.isPending}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, name: e.target.value }))
                  }
                  value={editValues.name}
                />
              </Field>
              <Field className="shrink-0">
                <FieldLabel>Expiration</FieldLabel>
                <Select
                  disabled={updateMutation.isPending}
                  onValueChange={(value) =>
                    setEditValues((prev) => ({
                      ...prev,
                      expiration: value as ApiKeyExpiration,
                    }))
                  }
                  value={editValues.expiration}
                >
                  <SelectTrigger>
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    {API_KEY_EXPIRATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <FieldLabel>
                  Permissions
                  <span className="text-destructive -ml-1">*</span>
                </FieldLabel>
                <ApiKeyPermissionSelector
                  accessMode={editValues.accessMode}
                  disabled={updateMutation.isPending}
                  onAccessModeChange={(mode, nextScopes) =>
                    setEditValues((prev) => ({
                      ...prev,
                      accessMode: mode,
                      scopes: nextScopes,
                    }))
                  }
                  onValueChange={(nextScopes) =>
                    setEditValues((prev) => ({
                      ...prev,
                      scopes: nextScopes,
                    }))
                  }
                  value={editValues.scopes}
                />
              </Field>
            </div>
            <ResponsiveDialogFooter className="bg-background/95 supports-backdrop-filter:bg-background/80 mx-0 mb-0 shrink-0 rounded-b-xl border-t p-4">
              <ResponsiveDialogClose
                disabled={updateMutation.isPending}
                render={<Button variant="outline">Cancel</Button>}
              />
              <Button disabled={updateMutation.isPending} type="submit">
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeletingKey(null);
          }
        }}
        open={!!deletingKey}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Delete account API key?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This will permanently delete
              {deletingKey ? ` ${deletingKey.name}` : " this API key"}. This
              action cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!deletingKey || deleteMutation.isPending}
              onClick={() => {
                if (deletingKey) {
                  deleteMutation.mutate(deletingKey.keyId);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete API Key"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  );
}
