import type {
  AddMcpServerFormValues,
  beginMcpOAuthRequestSchema,
} from "@notra/schemas/dashboard/integrations";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { z } from "zod";

import type { useMcpServerForm } from "@/lib/hooks/use-mcp-server-form";

export type BeginMcpOAuthRequest = z.infer<typeof beginMcpOAuthRequestSchema>;

export type McpTestStatus = "idle" | "testing" | "success" | "error";

export type McpDialogStatus = "idle" | "testing" | "creating" | "redirecting";

export interface McpIconUrls {
  darkUrl?: string | null;
  lightUrl?: string | null;
}

export interface McpIconProps extends McpIconUrls {
  className?: string;
}

export interface GetMcpIconUrlsInput extends McpIconUrls {
  fallbackUrl?: string | null;
}

export interface McpConnectionTestStatusProps {
  message: string;
  status: McpTestStatus;
}

export type McpServerFormApi = ReturnType<typeof useMcpServerForm>;

export interface McpAuthenticationFieldsProps {
  form: McpServerFormApi;
  headerRowIds: string[];
  invalidateTestResult: () => void;
  lockAuthType?: boolean;
  setHeaderRowIds: Dispatch<SetStateAction<string[]>>;
}

export interface McpServerDetailsFieldsProps {
  form: McpServerFormApi;
  invalidateTestResult: () => void;
  readOnly?: boolean;
}

export interface McpDialogFooterProps {
  authType: "none" | "headers" | "oauth";
  canSubmit: boolean;
  status: McpDialogStatus;
  onCancel: () => void;
  onTest: () => void;
}

export interface McpServer {
  authType: "none" | "headers" | "oauth";
  id: string;
  name: string;
  url: string;
  description?: string | null;
  headerNames?: string[];
  hasHeaders?: boolean;
  enabled: boolean;
  lastToolSyncAt?: string | null;
  toolSyncStatus?: "idle" | "syncing" | "synced" | "error" | string;
  toolSyncError?: string | null;
  indexedToolCount?: number;
  oauthStatus?: "connected" | "reauth_required" | "error" | string | null;
}

export interface AddMcpServerDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<AddMcpServerFormValues>;
  storeIntegrationId?: string;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
}

export interface McpStoreIntegration {
  id: string;
  slug: string | null;
  name: string;
  url: string;
  description: string | null;
  author: string | null;
  websiteUrl: string | null;
  brandColor: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  authType: string;
  indexedToolCount: number;
  connected: boolean;
  connection: McpServer | null;
}

export interface ConnectedMcpStoreIntegration extends McpStoreIntegration {
  connection: McpServer;
}

export interface StoreIntegrationsSectionProps {
  organizationId: string;
  organizationSlug: string;
  connectSlug?: string;
}

export interface StoreIntegrationLogoProps {
  integration: McpStoreIntegration;
}

export interface StoreIntegrationCardProps {
  integration: McpStoreIntegration;
  connectPending: boolean;
  onConnect: (integration: McpStoreIntegration) => void;
  onManage: (integration: McpStoreIntegration) => void;
}

export interface StoreIntegrationDialogsProps {
  organizationId: string;
  confirmingIntegration: McpStoreIntegration | null;
  confirmingPending: boolean;
  connectingIntegration: McpStoreIntegration | null;
  managingIntegration: McpStoreIntegration | null;
  onConfirmConnect: () => void;
  onConfirmingClose: () => void;
  onConnectingClose: () => void;
  onConnectingSuccess: () => void;
  onManagingClose: () => void;
}

export interface ConnectStoreIntegrationDialogProps {
  connecting: boolean;
  integration: McpStoreIntegration;
  onConnect: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export interface ManageStoreIntegrationDialogProps {
  integration: ConnectedMcpStoreIntegration;
  onDisconnected: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: string;
}

export interface McpCredentialHeaderRow {
  id: string;
  name: string;
  value: string;
}

export interface McpStoreConnectionUpdate {
  authType?: "headers";
  enabled?: boolean;
  headers?: Record<string, string>;
}

export interface McpConnectionDetailProps {
  children: ReactNode;
  label: string;
}

export interface McpConnectionSummaryProps {
  connection: McpServer;
}

export interface McpCredentialEditorProps {
  headerRows: McpCredentialHeaderRow[];
  onUpdate: () => void;
  setHeaderRows: Dispatch<SetStateAction<McpCredentialHeaderRow[]>>;
  updating: boolean;
}

export interface McpConnectionActionsProps {
  connection: McpServer;
  onDisconnect: () => void;
  onReauthorize: () => void;
  onRefresh: () => void;
  onToggle: () => void;
  reauthorizing: boolean;
  refreshing: boolean;
  updating: boolean;
}

export interface McpDisconnectDialogProps {
  disconnecting: boolean;
  integrationName: string;
  onDisconnect: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export interface StoreIntegrationDialogLogoProps {
  integration: ConnectedMcpStoreIntegration;
}

export interface McpServerCardProps {
  server: McpServer;
  onToggle?: (id: string, enabled: boolean) => void;
  onDelete?: (id: string) => void;
  onRefreshTools?: (id: string) => void;
  onReauthorize?: (id: string) => void;
  refreshing?: boolean;
  reauthorizing?: boolean;
}

export interface McpIntegrationCardProps {
  organizationId: string;
  organizationSlug: string;
}
