"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useEffect, useState } from "react";

import { ChatTodoList } from "@/components/ai/chat-todo-list";
import {
  DESIGN_SYSTEM_TODO_LIVE_STEP_MS,
  DESIGN_SYSTEM_TODO_LIVE_STEPS,
  DESIGN_SYSTEM_TODO_STATES,
} from "@/constants/design-system-todo-list";

function DesignSystemTodoLiveDemo() {
  const [step, setStep] = useState(0);
  const lastStep = DESIGN_SYSTEM_TODO_LIVE_STEPS.length - 1;
  const isRunning = step < lastStep;

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timeout = setTimeout(
      () => setStep((current) => current + 1),
      DESIGN_SYSTEM_TODO_LIVE_STEP_MS
    );
    return () => clearTimeout(timeout);
  }, [isRunning, step]);

  return (
    <div className="space-y-2" data-preview="todo-live">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Live · agent updates the plan
        </p>
        <Button onClick={() => setStep(0)} size="sm" variant="outline">
          Replay
        </Button>
      </div>
      <ChatTodoList
        isActive={isRunning}
        todos={DESIGN_SYSTEM_TODO_LIVE_STEPS[step] ?? []}
      />
    </div>
  );
}

export function DesignSystemTodoListDemo() {
  return (
    <div className="space-y-6">
      <DesignSystemTodoLiveDemo />
      <div className="grid gap-6 lg:grid-cols-2">
        {DESIGN_SYSTEM_TODO_STATES.map((state) => (
          <div
            className="space-y-2"
            data-preview={`todo-${state.id}`}
            key={state.id}
          >
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {state.label}
            </p>
            <ChatTodoList
              isActive={state.isActive}
              isStopped={state.isStopped}
              todos={state.todos}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
