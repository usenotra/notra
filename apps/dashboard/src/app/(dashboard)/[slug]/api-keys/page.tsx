"use client";

import {
  Add01Icon,
  Book01Icon,
  Delete02Icon,
  Dots,
  Edit02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  API_KEY_ACCESS_MODE_VALUES,
  API_KEY_DEFAULT_SCOPES,
  API_KEY_EXPIRATION_VALUES,
} from "@notra/schemas/constants/dashboard/api-keys";
import type {
  CreateApiKeyInput,
  UpdateApiKeyInput,
} from "@notra/schemas/dashboard/api-keys";
import {
  createApiKeySchema,
  updateApiKeySchema,
} from "@notra/schemas/dashboard/api-keys";
import { ConnectedCards } from "@notra/ui/components/shared/connected-cards";
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
  ResponsiveDialogDescription,
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
import { Kbd } from "@notra/ui/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  KeyResponseData,
  V2KeysCreateKeyResponseData,
} from "@unkey/api/models/components";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useReducer,
} from "react";
import { toast } from "sonner";

import { ApiKeyRevealField } from "@/components/api-keys/api-key-reveal-field";
import { ApiKeyPermissionSelector } from "@/components/api-keys/permission-selector";
import { TrackingTokenCard } from "@/components/api-keys/tracking-token-card";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";
import { Table, type TableColumn } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  API_KEY_EXPIRATION_OPTIONS,
  API_KEY_PERMISSION_SUMMARY,
} from "@/constants/api-keys";
import { API_KEY_CARD_ITEMS, API_KEY_PRESETS } from "@/lib/api-keys/presets";
import { expandLegacyApiKeyScopes } from "@/lib/api-keys/scopes";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ApiKeyAccessMode,
  ApiKeyCreateConfig,
  ApiKeyExpiration,
  ApiKeyFormValues,
} from "@/types/api-keys";

const NEW_KEY_CONFIG_PARSERS = {
  name: parseAsString,
  accessMode: parseAsStringLiteral(API_KEY_ACCESS_MODE_VALUES).withDefault(
    "restricted"
  ),
  scopes: parseAsArrayOf(parseAsString),
  expiration: parseAsStringLiteral(API_KEY_EXPIRATION_VALUES),
};

const DEFAULT_NEW_KEY_CONFIG: ApiKeyCreateConfig = {
  name: "",
  accessMode: "restricted",
  scopes: [...API_KEY_DEFAULT_SCOPES],
  expiration: "never",
};

const EDIT_FORM_DEFAULTS: ApiKeyFormValues = {
  keyId: "",
  name: "",
  accessMode: "restricted",
  scopes: [...API_KEY_DEFAULT_SCOPES],
  expiration: "never",
};

interface ApiKeyEditForm {
  // TanStack Form's Field component carries deep generics that are local to the
  // useForm call site. The dialog only renders fields from that instance.
  Field: ComponentType<{
    name: string;
    validators?: unknown;
    children: (field: {
      handleBlur: () => void;
      handleChange: (value: string | string[]) => void;
      state: {
        value: unknown;
        meta: {
          isTouched: boolean;
          errors: unknown[];
        };
      };
    }) => ReactNode;
  }>;
}

type ApiKeyListItem = Omit<
  Pick<
    KeyResponseData,
    "keyId" | "name" | "start" | "createdAt" | "expires" | "enabled"
  >,
  "name" | "expires"
> & {
  name: string;
  accessMode: ApiKeyAccessMode;
  expires: number | null;
  permission: keyof typeof API_KEY_PERMISSION_SUMMARY;
  permissions: string[];
  createdBy: string | null;
};

type CreateApiKeyResponse = V2KeysCreateKeyResponseData & {
  name: string;
};

interface ApiKeyMutationResponse {
  success: boolean;
}

interface ApiKeysUiState {
  dialogOpen: boolean;
  createdKey: string | null;
  createError: string | null;
  editDialogOpen: boolean;
  deletingKey: ApiKeyListItem | null;
}

type ApiKeysUiAction =
  | { type: "createDialogChanged"; open: boolean }
  | { type: "createdKeyChanged"; createdKey: string | null }
  | { type: "createErrorChanged"; createError: string | null }
  | { type: "editDialogChanged"; open: boolean }
  | { type: "deletingKeyChanged"; deletingKey: ApiKeyListItem | null }
  | { type: "createDialogReset" };

const initialApiKeysUiState: ApiKeysUiState = {
  dialogOpen: false,
  createdKey: null,
  createError: null,
  editDialogOpen: false,
  deletingKey: null,
};

function apiKeysUiReducer(
  state: ApiKeysUiState,
  action: ApiKeysUiAction
): ApiKeysUiState {
  switch (action.type) {
    case "createDialogChanged":
      return { ...state, dialogOpen: action.open };
    case "createdKeyChanged":
      return { ...state, createdKey: action.createdKey };
    case "createErrorChanged":
      return { ...state, createError: action.createError };
    case "editDialogChanged":
      return { ...state, editDialogOpen: action.open };
    case "deletingKeyChanged":
      return { ...state, deletingKey: action.deletingKey };
    case "createDialogReset":
      return {
        ...state,
        dialogOpen: false,
        createdKey: null,
        createError: null,
      };
    default:
      return state;
  }
}

function formatExpiry(expires: number | null) {
  if (!expires) {
    return "Never";
  }
  const date = new Date(expires);
  if (date.getTime() < Date.now()) {
    return "Expired";
  }
  return date.toLocaleDateString();
}

function formatPermissionLabel(apiKey: ApiKeyListItem) {
  return API_KEY_PERMISSION_SUMMARY[apiKey.permission];
}

function getDefaultEditExpiration(
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

function ApiKeysHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground">
          Manage API keys for programmatic access to your organization
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button className="gap-1.5" onClick={onCreate}>
          <HugeiconsIcon className="size-4" icon={Add01Icon} />
          Create API Key
          <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={() =>
                    window.open(
                      "https://docs.usenotra.com/api/getting-started",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  size="icon"
                  variant="outline"
                />
              }
            >
              <HugeiconsIcon className="size-4" icon={Book01Icon} />
            </TooltipTrigger>
            <TooltipContent>View API documentation</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function ApiKeysTable({
  actionsDisabled,
  isPending,
  keys,
  onDelete,
  onEdit,
}: {
  actionsDisabled: boolean;
  isPending: boolean;
  keys: ApiKeyListItem[];
  onDelete: (key: ApiKeyListItem) => void;
  onEdit: (key: ApiKeyListItem) => void;
}) {
  const columns: TableColumn<ApiKeyListItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "1fr",
      minWidth: "10rem",
      cell: (apiKey) => <span className="font-medium">{apiKey.name}</span>,
    },
    {
      key: "start",
      header: "Key",
      width: "1fr",
      minWidth: "9rem",
      cell: (apiKey) => (
        <span className="text-muted-foreground font-mono text-sm">
          {apiKey.start}…
        </span>
      ),
    },
    {
      key: "permission",
      header: "Permission",
      width: "1fr",
      minWidth: "9rem",
      cell: formatPermissionLabel,
    },
    {
      key: "expires",
      header: "Expires",
      width: "8.75rem",
      cell: (apiKey) => (
        <span className="text-muted-foreground text-sm">
          {formatExpiry(apiKey.expires)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created At",
      sortable: true,
      width: "9.5rem",
      cell: (apiKey) => (
        <span className="text-muted-foreground text-sm">
          {new Date(apiKey.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "4rem",
      minWidth: "4rem",
      cell: (apiKey) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${apiKey.name}`}
                size="icon"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={Dots} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={actionsDisabled}
                onClick={() => onEdit(apiKey)}
              >
                <HugeiconsIcon className="size-4" icon={Edit02Icon} />
                Edit API key
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={actionsDisabled}
                onClick={() => onDelete(apiKey)}
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
  const visibleRows = isPending ? 3 : Math.max(keys.length, 1);

  return (
    <Table
      columns={columns}
      data={keys}
      emptyState="No API keys yet"
      getRowId={(apiKey) => apiKey.keyId}
      height={(visibleRows + 1) * 48}
      loading={isPending}
      rowHeight={48}
    />
  );
}

function ApiKeyQuickStart({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Quick start</h2>
        <p className="text-muted-foreground text-sm">
          Spin up a key preconfigured for how you plan to use the API.
        </p>
      </div>
      <ConnectedCards items={API_KEY_CARD_ITEMS} onSelect={onSelect} />
    </div>
  );
}

function CreateApiKeyDialog({
  createError,
  createdKey,
  input,
  isPending,
  onAccessModeChange,
  onExpirationChange,
  onNameChange,
  onOpenChange,
  onOpenChangeComplete,
  onScopesChange,
  onSubmit,
  open,
}: {
  createError: string | null;
  createdKey: string | null;
  input: ApiKeyCreateConfig;
  isPending: boolean;
  onAccessModeChange: (accessMode: ApiKeyAccessMode, scopes: string[]) => void;
  onExpirationChange: (expiration: ApiKeyExpiration) => void;
  onNameChange: (name: string | null) => void;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
  onScopesChange: (scopes: string[]) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <ResponsiveDialog
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      open={open}
    >
      <ResponsiveDialogContent
        className={
          createdKey
            ? "sm:max-w-md"
            : "flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        }
        drawerClassName="[&>form]:px-0"
      >
        {createdKey ? (
          <>
            <ResponsiveDialogHeader className="shrink-0">
              <ResponsiveDialogTitle>View API Key</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="space-y-4">
              <Alert variant="info">
                <HugeiconsIcon icon={InformationCircleIcon} />
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
          <>
            <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
              <ResponsiveDialogTitle className="text-2xl">
                Create API Key
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Create a new API key for your organization.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <Field className="shrink-0">
                  <FieldLabel>
                    Name<span className="text-destructive -ml-1">*</span>
                  </FieldLabel>
                  <Input
                    disabled={isPending}
                    onChange={(event) =>
                      onNameChange(event.target.value || null)
                    }
                    placeholder="e.g. CI/CD Pipeline"
                    value={input.name}
                  />
                  {createError ? (
                    <p className="text-destructive text-sm">{createError}</p>
                  ) : null}
                </Field>

                <Field className="shrink-0">
                  <FieldLabel>
                    Expiration
                    <span className="text-muted-foreground -ml-1 text-xs">
                      (Optional)
                    </span>
                  </FieldLabel>
                  <Select
                    disabled={isPending}
                    onValueChange={(value) =>
                      onExpirationChange(value as ApiKeyExpiration)
                    }
                    value={input.expiration}
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
                    accessMode={input.accessMode}
                    className="[&>div]:py-2.5"
                    disabled={isPending}
                    onAccessModeChange={onAccessModeChange}
                    onValueChange={onScopesChange}
                    value={input.scopes}
                  />
                </Field>
              </div>
              <ResponsiveDialogFooter className="bg-background/95 supports-backdrop-filter:bg-background/80 mx-0 mb-0 shrink-0 rounded-b-xl border-t p-4 sm:justify-between">
                <ResponsiveDialogClose
                  disabled={isPending}
                  render={<Button variant="outline">Cancel</Button>}
                />
                <Button disabled={isPending} type="submit">
                  {isPending ? "Creating…" : "Create Key"}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function EditApiKeyDialog({
  editForm,
  isPending,
  onOpenChange,
  onSubmit,
  open,
}: {
  editForm: ApiKeyEditForm;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent
        className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        drawerClassName="[&>form]:px-0"
      >
        <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
            <ResponsiveDialogTitle className="text-2xl">
              Edit API Key
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <editForm.Field
              name="name"
              validators={{ onChange: updateApiKeySchema.shape.name }}
            >
              {(field) => (
                <Field className="shrink-0">
                  <FieldLabel>
                    Name<span className="text-destructive -ml-1">*</span>
                  </FieldLabel>
                  <Input
                    autoFocus
                    disabled={isPending}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="e.g. CI/CD Pipeline"
                    value={field.state.value as string}
                  />
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-sm">
                      {typeof field.state.meta.errors[0] === "string"
                        ? field.state.meta.errors[0]
                        : ((field.state.meta.errors[0] as { message?: string })
                            ?.message ?? "Invalid value")}
                    </p>
                  ) : null}
                </Field>
              )}
            </editForm.Field>

            <editForm.Field name="expiration">
              {(field) => (
                <Field className="shrink-0">
                  <FieldLabel>Expiration</FieldLabel>
                  <Select
                    disabled={isPending}
                    onValueChange={(value) =>
                      field.handleChange(value as ApiKeyExpiration)
                    }
                    value={field.state.value as ApiKeyExpiration}
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
              )}
            </editForm.Field>

            <editForm.Field name="accessMode">
              {(accessModeField) => (
                <editForm.Field name="scopes">
                  {(scopesField) => (
                    <Field className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                      <FieldLabel>
                        Permissions
                        <span className="text-destructive -ml-1">*</span>
                      </FieldLabel>
                      <ApiKeyPermissionSelector
                        accessMode={
                          accessModeField.state.value as ApiKeyAccessMode
                        }
                        className="[&>div]:py-2.5"
                        disabled={isPending}
                        onAccessModeChange={(accessMode, scopes) => {
                          accessModeField.handleChange(accessMode);
                          scopesField.handleChange(scopes);
                        }}
                        onValueChange={(scopes) =>
                          scopesField.handleChange(scopes)
                        }
                        value={scopesField.state.value as string[]}
                      />
                    </Field>
                  )}
                </editForm.Field>
              )}
            </editForm.Field>
          </div>
          <ResponsiveDialogFooter className="bg-background/95 supports-backdrop-filter:bg-background/80 mx-0 mb-0 shrink-0 rounded-b-xl border-t p-4">
            <ResponsiveDialogClose
              disabled={isPending}
              render={<Button variant="outline">Cancel</Button>}
            />
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function DeleteApiKeyDialog({
  apiKey,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  apiKey: ApiKeyListItem | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={!!apiKey}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            Delete API Key?
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            This will permanently delete
            {apiKey ? ` ${apiKey.name}` : " this API key"}. This action cannot
            be undone.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            Cancel
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!apiKey || isPending}
            onClick={onConfirm}
          >
            {isPending ? "Deleting…" : "Delete API Key"}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

export default function ApiKeysPage() {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const queryClient = useQueryClient();
  const [
    { dialogOpen, createdKey, createError, editDialogOpen, deletingKey },
    dispatchUi,
  ] = useReducer(apiKeysUiReducer, initialApiKeysUiState);
  const [newKeyConfig, setNewKeyConfig] = useQueryStates(
    NEW_KEY_CONFIG_PARSERS
  );
  const hasNewKeyConfig =
    newKeyConfig.name !== null &&
    newKeyConfig.scopes !== null &&
    newKeyConfig.expiration !== null;

  useHotkey(
    "C",
    () => dispatchUi({ type: "createDialogChanged", open: true }),
    {
      enabled: !(
        dialogOpen ||
        editDialogOpen ||
        !!deletingKey ||
        hasNewKeyConfig
      ),
    }
  );

  const { data: keys = [], isPending } = useQuery<ApiKeyListItem[]>({
    ...dashboardOrpc.apiKeys.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
    }),
    enabled: !!organizationId,
  });

  const newKeyName = newKeyConfig.name;
  const newKeyAccessMode =
    newKeyConfig.accessMode ?? DEFAULT_NEW_KEY_CONFIG.accessMode;
  const newKeyScopes = newKeyConfig.scopes ?? DEFAULT_NEW_KEY_CONFIG.scopes;
  const newKeyExpiration =
    newKeyConfig.expiration ?? DEFAULT_NEW_KEY_CONFIG.expiration;
  const createInput = {
    name: newKeyName ?? DEFAULT_NEW_KEY_CONFIG.name,
    accessMode: newKeyAccessMode,
    scopes: newKeyScopes,
    expiration: newKeyExpiration,
  };

  useEffect(() => {
    if (hasNewKeyConfig) {
      dispatchUi({ type: "createDialogChanged", open: true });
    }
  }, [hasNewKeyConfig]);

  const handlePresetSelect = (id: string) => {
    const preset = API_KEY_PRESETS.find((item) => item.id === id);
    if (!preset) {
      return;
    }
    const config = {
      name: preset.defaultName,
      accessMode: preset.accessMode,
      scopes: preset.scopes,
      expiration: preset.expiration,
    };
    dispatchUi({ type: "createErrorChanged", createError: null });
    dispatchUi({ type: "createDialogChanged", open: true });
    setNewKeyConfig(config);
  };

  const handleCreateSubmit = () => {
    const result = createApiKeySchema.safeParse(createInput);
    if (!result.success) {
      dispatchUi({
        type: "createErrorChanged",
        createError: result.error.issues[0]?.message ?? "Invalid API key",
      });
      return;
    }

    dispatchUi({ type: "createErrorChanged", createError: null });
    mutation.mutate(result.data);
  };

  const editForm = useForm({
    defaultValues: EDIT_FORM_DEFAULTS,
    onSubmit: ({ value }) => {
      const result = updateApiKeySchema.safeParse(value);
      if (!result.success) {
        return;
      }
      editMutation.mutate(result.data);
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateApiKeyInput) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return dashboardOrpc.apiKeys.create.call({
        organizationId,
        ...values,
      }) as Promise<CreateApiKeyResponse>;
    },
    onSuccess: (data) => {
      dispatchUi({ type: "createdKeyChanged", createdKey: data.key });
      dispatchUi({ type: "createErrorChanged", createError: null });
      setNewKeyConfig(null);
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.apiKeys.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      toast.success("API key created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: async (values: UpdateApiKeyInput) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return dashboardOrpc.apiKeys.update.call({
        organizationId,
        keyIdParam: values.keyId,
        payload: values,
      }) as Promise<ApiKeyMutationResponse>;
    },
    onSuccess: () => {
      dispatchUi({ type: "editDialogChanged", open: false });
      editForm.reset();
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.apiKeys.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      toast.success("API key updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return dashboardOrpc.apiKeys.delete.call({
        organizationId,
        keyIdParam: keyId,
        payload: { keyId },
      }) as Promise<ApiKeyMutationResponse>;
    },
    onSuccess: () => {
      dispatchUi({ type: "deletingKeyChanged", deletingKey: null });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.apiKeys.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      toast.success("API key deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDialogClose = (open: boolean) => {
    if (!open && mutation.isPending) {
      return;
    }

    dispatchUi({ type: "createDialogChanged", open });
  };

  const handleDialogOpenChangeComplete = (open: boolean) => {
    if (open) {
      return;
    }

    mutation.reset();
    setNewKeyConfig(null);
    dispatchUi({ type: "createDialogReset" });
  };

  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      if (editMutation.isPending) {
        return;
      }
      editForm.reset();
    }
    dispatchUi({ type: "editDialogChanged", open });
  };

  const handleDeleteDialogClose = (open: boolean) => {
    if (!open && deleteMutation.isPending) {
      return;
    }

    if (!open) {
      dispatchUi({ type: "deletingKeyChanged", deletingKey: null });
    }
  };

  const openEditDialog = (key: ApiKeyListItem) => {
    const scopes = expandLegacyApiKeyScopes(key.permissions);

    editForm.reset({
      keyId: key.keyId,
      name: key.name,
      accessMode: key.accessMode,
      scopes,
      expiration: getDefaultEditExpiration(key.createdAt, key.expires),
    });
    editForm.setFieldValue("name", key.name);
    dispatchUi({ type: "editDialogChanged", open: true });
  };

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <ApiKeysHeader
          onCreate={() =>
            dispatchUi({ type: "createDialogChanged", open: true })
          }
        />

        <ApiKeysTable
          actionsDisabled={editMutation.isPending || deleteMutation.isPending}
          isPending={isPending}
          keys={keys}
          onDelete={(key) =>
            dispatchUi({
              type: "deletingKeyChanged",
              deletingKey: key,
            })
          }
          onEdit={openEditDialog}
        />

        <ApiKeyQuickStart onSelect={handlePresetSelect} />

        {organizationId ? (
          <TrackingTokenCard organizationId={organizationId} />
        ) : null}
      </div>

      <CreateApiKeyDialog
        createdKey={createdKey}
        createError={createError}
        input={createInput}
        isPending={mutation.isPending}
        onAccessModeChange={(accessMode, scopes) =>
          setNewKeyConfig({ accessMode, scopes })
        }
        onExpirationChange={(expiration) => setNewKeyConfig({ expiration })}
        onNameChange={(name) => {
          dispatchUi({ type: "createErrorChanged", createError: null });
          setNewKeyConfig({ name });
        }}
        onOpenChange={handleDialogClose}
        onOpenChangeComplete={handleDialogOpenChangeComplete}
        onScopesChange={(scopes) => setNewKeyConfig({ scopes })}
        onSubmit={handleCreateSubmit}
        open={dialogOpen}
      />

      <EditApiKeyDialog
        editForm={editForm as unknown as ApiKeyEditForm}
        isPending={editMutation.isPending}
        onOpenChange={handleEditDialogClose}
        onSubmit={editForm.handleSubmit}
        open={editDialogOpen}
      />

      <DeleteApiKeyDialog
        apiKey={deletingKey}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingKey) {
            return;
          }
          deleteMutation.mutate(deletingKey.keyId);
        }}
        onOpenChange={handleDeleteDialogClose}
      />
    </PageContainer>
  );
}
