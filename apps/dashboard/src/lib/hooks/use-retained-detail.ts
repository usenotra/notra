"use client";

import { useState } from "react";

// Keep the selected content intact while the dialog completes its exit.
export function useRetainedDetail<T>(value: T | null) {
  const [retained, setRetained] = useState(value);
  if (value !== null && value !== retained) {
    setRetained(value);
  }
  return value ?? retained;
}
