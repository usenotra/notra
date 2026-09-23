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
import { ChatSkillSlashMenu } from "@/components/chat/chat-skill-slash-menu";
import { Composer } from "@/components/composer/composer-shell";
import { useContentChatInput } from "@/lib/hooks/use-content-chat-input";
import type {
  ChatInputComposerNudgeProps,
  ChatInputContextPickerProps,
  ChatInputProps,
} from "@/types/components/chat-input";

const ChatInput = (props: ChatInputProps) => (
  <ContentChatInputComposer {...props} />
);

function ContentChatInputComposer(props: ChatInputProps) {
  const {
    acceptedFileTypesLabel,
    allowedChatMimeTypes,
    attachments,
    attachmentTooltipText,
    closeSlashMenu,
    connectedTop,
    context,
    contextOptions,
    contextPickerDisabledReason,
    contextPickerId,
    dragHandlers,
    fileInputRef,
    filteredSkills,
    handlePaste,
    handleSend,
    hasAttachmentChips,
    hasContextChips,
    insertSlashSkill,
    isContextPickerOpen,
    isDraggingFile,
    isInContext,
    isInputLocked,
    isLoading,
    isSlashMenuOpen,
    onAttach,
    onClearSelection,
    onComposerKeyDown,
    onComposerSelect,
    onComposerValueChange,
    onEditQueued,
    onFileInputChange,
    onRemoveContext,
    onRemoveQueued,
    onStop,
    organizationSlug,
    placeholder,
    pendingUploads,
    previewAttachment,
    queuedMessages,
    remainingChatCredits,
    removeAttachment,
    resizeTextarea,
    selection,
    sendDisabled,
    sendLabel,
    sendTooltip,
    setIsContextPickerOpen,
    setIsFocused,
    setPreviewAttachment,
    shouldShowLowCredits,
    showComposerNudge,
    showStop,
    skillCount,
    slashIndex,
    slashListRef,
    textareaRef,
    toggleContextItem,
    usageLimitError,
    value,
  } = useContentChatInput(props);

  return (
    <>
      {isDraggingFile ? (
        <ChatComposerDropOverlay
          acceptedFileTypesLabel={acceptedFileTypesLabel}
        />
      ) : null}
      <div className="relative w-full min-w-0" {...dragHandlers}>
        {isSlashMenuOpen ? (
          <ChatSkillSlashMenu
            filteredSkills={filteredSkills}
            onSelect={insertSlashSkill}
            organizationSlug={organizationSlug}
            skillCount={skillCount}
            slashIndex={slashIndex}
            slashListRef={slashListRef}
          />
        ) : null}
        <Composer.Frame
          connectedTop={connectedTop}
          nudge={
            showComposerNudge ? (
              <ChatInputComposerNudge
                attachments={attachments}
                context={context}
                hasAttachmentChips={hasAttachmentChips}
                hasContextChips={hasContextChips}
                onClearSelection={onClearSelection}
                onEditQueued={onEditQueued}
                onRemoveContext={onRemoveContext}
                onRemoveQueued={onRemoveQueued}
                organizationSlug={organizationSlug}
                pendingUploads={pendingUploads}
                queuedMessages={queuedMessages}
                remainingChatCredits={remainingChatCredits}
                removeAttachment={removeAttachment}
                selection={selection}
                setPreviewAttachment={setPreviewAttachment}
                shouldShowLowCredits={shouldShowLowCredits}
                usageLimitError={usageLimitError}
              />
            ) : null
          }
        >
          <section aria-label="Chat input drop area">
            <input
              accept={allowedChatMimeTypes.join(",")}
              className="hidden"
              multiple
              onChange={onFileInputChange}
              ref={fileInputRef}
              type="file"
            />
            <Textarea
              aria-activedescendant={
                isSlashMenuOpen && filteredSkills[slashIndex]
                  ? `chat-skill-slash-option-${filteredSkills[slashIndex].name}`
                  : undefined
              }
              aria-autocomplete={isSlashMenuOpen ? "list" : undefined}
              aria-expanded={isSlashMenuOpen}
              aria-haspopup={isSlashMenuOpen ? "listbox" : undefined}
              aria-label="Send a message"
              className="text-foreground caret-foreground block field-sizing-fixed max-h-50 min-h-12 w-full min-w-0 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-3 py-2 text-sm leading-6 whitespace-pre-wrap shadow-none ring-0 outline-none focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-50 dark:bg-transparent dark:disabled:bg-transparent"
              disabled={isInputLocked}
              onBlur={() => {
                setIsFocused(false);
                window.setTimeout(() => {
                  if (!slashListRef.current?.contains(document.activeElement)) {
                    closeSlashMenu();
                  }
                }, 150);
              }}
              onChange={(event) => {
                onComposerValueChange(
                  event.target.value,
                  event.target.selectionStart
                );
              }}
              onFocus={() => setIsFocused(true)}
              onInput={resizeTextarea}
              onKeyDown={onComposerKeyDown}
              onPaste={handlePaste}
              onSelect={onComposerSelect}
              placeholder={
                isLoading
                  ? "Queue a message..."
                  : (placeholder ?? "Send a message... (type / for skills)")
              }
              ref={textareaRef}
              rows={1}
              value={value}
            />
            <Composer.Toolbar>
              <ChatComposerAttachButton
                attachmentCount={attachments.length}
                disabled={isInputLocked || isLoading}
                onAttach={onAttach}
                pendingUploadCount={pendingUploads.length}
                tooltip={attachmentTooltipText}
              />
              <ChatInputContextPicker
                contextOptions={contextOptions}
                contextPickerId={contextPickerId}
                disabledReason={contextPickerDisabledReason}
                isInContext={isInContext}
                isOpen={isContextPickerOpen}
                onOpenChange={setIsContextPickerOpen}
                organizationSlug={organizationSlug}
                toggleContextItem={toggleContextItem}
              />
              <Composer.Send
                disabled={sendDisabled}
                label={sendLabel}
                onClick={showStop ? onStop : handleSend}
                tooltip={sendTooltip}
              >
                <HugeiconsIcon
                  className="size-4"
                  icon={showStop ? StopIcon : ArrowUp02Icon}
                  strokeWidth={2}
                />
              </Composer.Send>
            </Composer.Toolbar>
          </section>
        </Composer.Frame>
      </div>
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
        open={previewAttachment !== null}
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
