"use client";

import {
  Alert02Icon,
  ArrowUp02Icon,
  AtIcon,
  StopIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@notra/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import Link from "next/link";

import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import {
  ChatComposerAttachButton,
  ChatComposerAttachmentChips,
  ChatComposerDropOverlay,
} from "@/components/chat/chat-composer-attachments";
import { ChatContextConnectSuggestions } from "@/components/chat/chat-context-connect-suggestions";
import { ChatContextOptionContent } from "@/components/chat/chat-context-option-content";
import { ChatInputContextRow } from "@/components/chat/chat-input-context-row";
import { Composer } from "@/components/composer/composer-shell";
import { useContentChatInput } from "@/lib/hooks/use-content-chat-input";
import type {
  ChatInputComposerNudgeProps,
  ChatInputContextPickerProps,
  ChatInputProps,
} from "@/types/components/chat-input";
import type { ContentChatInputComposerProps } from "@/types/hooks/content-chat-input";

const ChatInput = (props: ChatInputProps) => {
  const input = useContentChatInput(props);
  return <ContentChatInputComposer input={input} />;
};

function ContentChatInputComposer({ input }: ContentChatInputComposerProps) {
  return (
    <>
      {input.isDraggingFile ? (
        <ChatComposerDropOverlay
          acceptedFileTypesLabel={input.acceptedFileTypesLabel}
        />
      ) : null}
      <div {...input.dragHandlers}>
        <Composer.Frame
          connectedTop={input.connectedTop}
          nudge={
            input.showComposerNudge ? (
              <ChatInputComposerNudge
                attachments={input.attachments}
                context={input.context}
                hasAttachmentChips={input.hasAttachmentChips}
                hasContextChips={input.hasContextChips}
                onClearSelection={input.onClearSelection}
                onEditQueued={input.onEditQueued}
                onRemoveContext={input.onRemoveContext}
                onRemoveQueued={input.onRemoveQueued}
                organizationSlug={input.organizationSlug}
                pendingUploads={input.pendingUploads}
                queuedMessages={input.queuedMessages}
                remainingChatCredits={input.remainingChatCredits}
                removeAttachment={input.removeAttachment}
                selection={input.selection}
                setPreviewAttachment={input.setPreviewAttachment}
                shouldShowLowCredits={input.shouldShowLowCredits}
                usageLimitError={input.usageLimitError}
              />
            ) : null
          }
        >
          <div className="flex min-w-0 items-end gap-1 p-1.5">
            <input
              accept={input.allowedChatMimeTypes.join(",")}
              className="hidden"
              multiple
              onChange={input.onFileInputChange}
              ref={input.fileInputRef}
              type="file"
            />
            <ChatComposerAttachButton
              attachmentCount={input.attachments.length}
              disabled={input.isInputLocked || input.isLoading}
              fileInputRef={input.fileInputRef}
              pendingUploadCount={input.pendingUploads.length}
              tooltip={input.attachmentTooltipText}
            />
            <ChatInputContextPicker
              contextOptions={input.contextOptions}
              contextPickerId={input.contextPickerId}
              disabledReason={input.contextPickerDisabledReason}
              isInContext={input.isInContext}
              isOpen={input.isContextPickerOpen}
              onOpenChange={input.setIsContextPickerOpen}
              organizationSlug={input.organizationSlug}
              toggleContextItem={input.toggleContextItem}
            />
            <Textarea
              aria-label="Send a message"
              className="text-foreground caret-foreground block field-sizing-fixed max-h-50 min-h-7 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-5 whitespace-pre-wrap shadow-none ring-0 outline-none focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-50 dark:bg-transparent dark:disabled:bg-transparent"
              disabled={input.isInputLocked}
              onBlur={() => input.setIsFocused(false)}
              onChange={(event) => {
                input.setValue(event.target.value);
              }}
              onFocus={() => input.setIsFocused(true)}
              onInput={input.resizeTextarea}
              onPaste={input.handlePaste}
              placeholder={
                input.isLoading
                  ? "Queue a message..."
                  : (input.placeholder ?? "Send a message...")
              }
              ref={input.textareaRef}
              rows={1}
              value={input.value}
            />
            <Composer.Send
              disabled={input.sendDisabled}
              label={input.sendLabel}
              onClick={input.showStop ? input.onStop : input.handleSend}
              tooltip={input.sendTooltip}
            >
              <HugeiconsIcon
                className="size-4"
                icon={input.showStop ? StopIcon : ArrowUp02Icon}
                strokeWidth={2}
              />
            </Composer.Send>
          </div>
        </Composer.Frame>
      </div>
      <AttachmentPreviewDialog
        attachment={input.previewAttachment}
        onOpenChange={(open) => {
          if (!open) {
            input.setPreviewAttachment(null);
          }
        }}
        open={input.previewAttachment !== null}
      />
    </>
  );
}

function ChatInputComposerNudge({
  attachments,
  context,
  hasAttachmentChips,
  hasContextChips,
  onClearSelection,
  onEditQueued,
  onRemoveContext,
  onRemoveQueued,
  organizationSlug,
  pendingUploads,
  queuedMessages,
  remainingChatCredits,
  removeAttachment,
  selection,
  setPreviewAttachment,
  shouldShowLowCredits,
  usageLimitError,
}: ChatInputComposerNudgeProps) {
  return (
    <Composer.Nudge
      action={
        usageLimitError && organizationSlug ? (
          <Button
            nativeButton={false}
            render={<Link href={`/${organizationSlug}/settings/billing`} />}
            size="xs"
            variant="outline"
          >
            Upgrade
          </Button>
        ) : null
      }
      title={
        shouldShowLowCredits &&
        !hasContextChips &&
        !hasAttachmentChips &&
        !usageLimitError
          ? `${remainingChatCredits} chat messages left`
          : undefined
      }
    >
      {hasContextChips || hasAttachmentChips ? (
        <>
          {queuedMessages.map((message) => (
            <Composer.Chip
              className="hover:border-border hover:bg-background w-full border-solid border-transparent bg-transparent transition-colors"
              editLabel="Edit queued message"
              key={message.id}
              label={message.text}
              labelClassName="min-w-0 flex-1 max-w-none"
              onEdit={onEditQueued ? () => onEditQueued(message) : undefined}
              onRemove={
                onRemoveQueued ? () => onRemoveQueued(message.id) : undefined
              }
              removeLabel="Remove from queue"
            />
          ))}
          <ChatInputContextRow
            context={context}
            onClearSelection={onClearSelection}
            onRemoveContext={onRemoveContext}
            selection={selection}
          />
          <ChatComposerAttachmentChips
            attachments={attachments}
            pendingUploads={pendingUploads}
            removeAttachment={removeAttachment}
            setPreviewAttachment={setPreviewAttachment}
          />
          {shouldShowLowCredits ? (
            <span className="text-muted-foreground text-xs">
              {remainingChatCredits} chat messages left
            </span>
          ) : null}
        </>
      ) : null}
      {usageLimitError ? (
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          <HugeiconsIcon
            className="text-warning size-4 shrink-0"
            icon={Alert02Icon}
          />
          <span className="truncate">{usageLimitError}</span>
        </span>
      ) : null}
    </Composer.Nudge>
  );
}

function ChatInputContextPicker({
  contextOptions,
  contextPickerId,
  disabledReason,
  isInContext,
  isOpen,
  onOpenChange,
  organizationSlug,
  toggleContextItem,
}: ChatInputContextPickerProps) {
  return (
    <Tooltip disabled={isOpen}>
      <TooltipTrigger
        render={
          disabledReason ? (
            // biome-ignore lint/a11y/useSemanticElements: a real button would illegally nest the disabled popover trigger button.
            <span
              aria-disabled="true"
              aria-label="Add tools or context"
              className="inline-flex size-7 shrink-0 cursor-not-allowed items-center justify-center"
              role="button"
              tabIndex={0}
            />
          ) : (
            <span className="inline-flex size-7 shrink-0 items-center justify-center" />
          )
        }
      >
        <Popover modal onOpenChange={onOpenChange} open={isOpen}>
          <PopoverTrigger
            render={
              <Composer.ToolbarButton
                aria-controls={contextPickerId}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Add tools or context"
                className="size-7 justify-center px-0"
                disabled={Boolean(disabledReason)}
                role="combobox"
              />
            }
          >
            <HugeiconsIcon className="size-4" icon={AtIcon} />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 p-0"
            id={contextPickerId}
            showBackdrop
            sideOffset={6}
          >
            <Command>
              <CommandInput placeholder="Search tools and context..." />
              <CommandList>
                <CommandEmpty>
                  {contextOptions.length === 0
                    ? "No matching integrations."
                    : "No matching tools or context found."}
                </CommandEmpty>
                {contextOptions.length === 0 && organizationSlug ? (
                  <ChatContextConnectSuggestions
                    onSelect={() => onOpenChange(false)}
                    organizationSlug={organizationSlug}
                  />
                ) : null}
                {contextOptions.length > 0 ? (
                  <CommandGroup heading="Context">
                    {contextOptions.map((option) => {
                      const inContext = isInContext(option.contextItem);
                      return (
                        <CommandItem
                          data-checked={inContext}
                          key={option.id}
                          keywords={[option.searchText]}
                          onSelect={() => {
                            toggleContextItem(option.contextItem, inContext);
                            onOpenChange(false);
                          }}
                          value={option.id}
                        >
                          <ChatContextOptionContent option={option} />
                          {inContext ? (
                            <HugeiconsIcon
                              className="text-primary ml-auto size-3.5"
                              icon={Tick02Icon}
                            />
                          ) : null}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ) : null}
              </CommandList>
              {organizationSlug ? (
                <div className="border-border border-t p-1">
                  <Link
                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none"
                    href={`/${organizationSlug}/integrations`}
                    onClick={() => onOpenChange(false)}
                  >
                    Manage integrations
                  </Link>
                </div>
              ) : null}
            </Command>
          </PopoverContent>
        </Popover>
      </TooltipTrigger>
      <TooltipContent>{disabledReason ?? "Tools and context"}</TooltipContent>
    </Tooltip>
  );
}

export default ChatInput;
