"use client";

import { Button } from "@notra/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@notra/ui/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ALL_INTEGRATIONS } from "@/lib/integrations/catalog";

type ChatInputProps = {
	onSend?: (value: string) => void;
};

const ChatInput = ({ onSend }: ChatInputProps) => {
	const [isFocused, setIsFocused] = useState(false);
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const resizeTextarea = useCallback(() => {
		const element = textareaRef.current;
		if (!element) return;
		element.style.height = "0px";
		element.style.height = `${element.scrollHeight}px`;
	}, []);
	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed) return;
		onSend?.(trimmed);
		setValue("");
		requestAnimationFrame(resizeTextarea);
	}, [onSend, resizeTextarea, value]);

	useHotkeys(
		"enter",
		(event) => {
			if (event.shiftKey) return;
			event.preventDefault();
			handleSend();
		},
		{
			enableOnFormTags: ["TEXTAREA"],
		},
		[handleSend],
	);

	return (
		<Card
			className="bg-surface-subtle ease-out-expo w-full gap-0 rounded-[14px] border-0 py-0 shadow-none transition-shadow duration-200"
			data-focused={isFocused ? "true" : "false"}
		>
			<CardHeader className="sr-only">
				<span>Chat input</span>
			</CardHeader>
			<CardContent className="p-0">
				<div className="rounded-[14px] p-0.5 shadow-lg" tabIndex={-1}>
					<div className="bg-surface flex flex-col rounded-xl shadow-md">
						<div className="flex w-full items-center">
							<div className="relative flex flex-1 cursor-text transition-colors [--lh:1lh]">
								<Textarea
									className="min-h-8 w-full resize-none border-0 bg-transparent py-0 pl-3.5 pr-2 text-sm text-neutral leading-8 whitespace-pre-wrap outline-none shadow-none ring-0 caret-neutral focus-visible:border-transparent focus-visible:ring-0 dark:caret-white"
									aria-label="Specify a workflow to handle..."
									placeholder="Specify a workflow to handle..."
									onBlur={() => setIsFocused(false)}
									onChange={(event) => {
										setValue(event.target.value);
									}}
									onFocus={() => setIsFocused(true)}
									onInput={resizeTextarea}
									ref={textareaRef}
									rows={1}
									value={value}
								/>
							</div>
						</div>
					</div>
					<CardFooter className="flex items-center justify-between overflow-hidden p-2">
						<div className="flex items-center gap-1 sm:gap-2">
							<Popover>
								<PopoverTrigger
									render={
										<Button
											className="group/button h-7 rounded-lg bg-transparent px-1.5 shadow-none transition-colors hover:bg-surface-strong/40 active:bg-surface-strong/60 focus-visible:ring-2 focus-visible:ring-white dark:focus-visible:ring-black"
											size="sm"
											variant="ghost"
										/>
									}
								>
									<div className="absolute inset-2 rounded-lg border border-transparent bg-surface-strong opacity-0 blur-sm transition-transform group-hover/button:inset-0 group-hover/button:opacity-100 group-hover/button:blur-none group-active/button:inset-shadow-xs group-active/button:shadow-none" />
									<div className="relative z-10 flex items-center gap-1 text-sm text-neutral-subtle group-hover/button:text-neutral">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="lucide lucide-at-sign size-4"
											aria-hidden="true"
										>
											<title>At sign</title>
											<circle cx="12" cy="12" r="4" />
											<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
										</svg>
										<div className="text-sm px-0.5 leading-0 transition-transform">
											<span className="hidden min-[400px]:inline">
												Add context
											</span>
										</div>
										<div className="flex items-center pr-1 sm:pr-2">
											<svg
												width="16"
												height="16"
												viewBox="0 0 16 16"
												fill="none"
												className="-mr-1.5 rounded-md ring-2 ring-white dark:ring-black"
											>
												<title>Slack</title>
												<rect width="16" height="16" fill="#533AFD" />
												<path
													fillRule="evenodd"
													clipRule="evenodd"
													d="M4.3 11.7L11.7 10.1307V4.3L4.3 5.88765V11.7Z"
													fill="white"
												/>
											</svg>
											<svg
												width="16"
												height="16"
												viewBox="0 0 16 16"
												fill="none"
												className="-mr-1.5 rounded-md ring-2 ring-white dark:ring-black"
											>
												<title>GitHub</title>
												<rect width="16" height="16" fill="#24292F" rx="3" />
												<path
													fillRule="evenodd"
													clipRule="evenodd"
													d="M8 1.33c-3.68 0-6.67 2.99-6.67 6.67 0 2.95 1.91 5.45 4.57 6.33.33.06.45-.14.45-.32v-1.24c-1.86.4-2.25-.79-2.25-.79-.3-.77-.74-.98-.74-.98-.61-.41.05-.4.05-.4.67.05 1.02.69 1.02.69.6 1.02 1.56.73 1.94.56.06-.43.23-.73.42-.89-1.48-.17-3.04-.74-3.04-3.3 0-.73.26-1.33.69-1.79-.07-.17-.3-.85.07-1.77 0 0 .56-.18 1.84.68.53-.15 1.1-.22 1.67-.22.57 0 1.14.08 1.67.22 1.28-.86 1.84-.68 1.84-.68.37.92.14 1.6.07 1.77.43.46.69 1.06.69 1.79 0 2.56-1.56 3.13-3.05 3.29.24.21.45.62.45 1.24v1.83c0 .18.12.39.46.32 2.65-.88 4.56-3.38 4.56-6.33 0-3.68-2.99-6.67-6.67-6.67z"
													fill="white"
												/>
											</svg>
											<svg
												width="16"
												height="16"
												viewBox="0 0 16 16"
												fill="none"
												className="rounded-md ring-2 ring-white dark:ring-black"
											>
												<title>Linear</title>
												<rect width="16" height="16" fill="#5E6AD2" rx="3" />
												<path
													d="M3.01 8.524c.115 1.102.595 2.173 1.44 3.017.844.844 1.915 1.324 3.016 1.44L3.01 8.523z"
													fill="white"
												/>
												<path
													d="M2.99 7.717l5.283 5.283c.448-.025.894-.11 1.323-.255L3.246 6.394a5.5 5.5 0 00-.255 1.323z"
													fill="white"
												/>
												<path
													d="M3.473 5.834l6.683 6.683c.347-.166.678-.374.987-.625L4.098 4.847a4.5 4.5 0 00-.625.987z"
													fill="white"
												/>
												<path
													d="M4.473 4.435c1.957-1.934 5.112-1.926 7.06.022 1.949 1.948 1.956 5.102.023 7.06L4.472 4.436z"
													fill="white"
												/>
											</svg>
										</div>
									</div>
								</PopoverTrigger>
								<PopoverContent
									align="start"
									className="bg-surface/100 border-neutral-subtle w-48 rounded-lg border p-1 shadow-lg"
								>
									{ALL_INTEGRATIONS.map((integration, index) => {
										const disabled = !integration.available;
										const isFirst = index === 0;
										return (
											<button
												className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
													disabled
														? "cursor-not-allowed opacity-50"
														: "hover:bg-surface-subtle"
												} ${isFirst ? "bg-surface-strong rounded-md" : ""}`}
												disabled={disabled}
												key={integration.id}
												type="button"
											>
												<span className="size-4 shrink-0 text-neutral [&_svg]:size-4">
													{integration.icon}
												</span>
												<span className="text-neutral">{integration.name}</span>
											</button>
										);
									})}
								</PopoverContent>
							</Popover>
						</div>
						<button
							tabIndex={0}
							type="button"
							className="group/button focus-visible:ring-neutral-strong relative inline-flex h-7 shrink-0 cursor-pointer select-none rounded-lg px-1.5 whitespace-nowrap outline-none transition-transform focus-visible:ring-2"
							onClick={handleSend}
						>
							<div className="absolute inset-0 rounded-lg shadow-xs transition-transform group-hover/button:to-surface-weak group-active/button:inset-shadow-xs group-active/button:shadow-none group-active/button:to-surface-subtle" />
							<div className="relative z-10 flex items-center gap-1 text-sm text-neutral">
								<div className="text-sm px-0.5 leading-0 transition-transform">
									Go
								</div>
								<div className="hidden h-4 items-center rounded border border-neutral bg-surface-weak px-1 text-[10px] text-neutral-subtle shadow-xs sm:inline-flex md:inline-flex">
									↵
								</div>
							</div>
						</button>
					</CardFooter>
				</div>
			</CardContent>
		</Card>
	);
};

export default ChatInput;
