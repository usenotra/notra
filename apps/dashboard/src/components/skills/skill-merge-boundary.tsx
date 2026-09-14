"use client";

import { Component } from "react";

import type { SkillMergeBoundaryProps } from "@/types/skills/page";

interface SkillMergeBoundaryState {
  failed: boolean;
}

/**
 * `UnresolvedFile` is still marked beta upstream. If it throws, the user keeps
 * a plain textarea with the conflict markers so the merge is never a dead end.
 */
export class SkillMergeBoundary extends Component<
  SkillMergeBoundaryProps,
  SkillMergeBoundaryState
> {
  constructor(props: SkillMergeBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): SkillMergeBoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
