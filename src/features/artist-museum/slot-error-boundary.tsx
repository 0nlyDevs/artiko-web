"use client";

import { Component, type ReactNode } from "react";

/**
 * A work whose image or 3D file fails to load (removed, blocked, corrupt) leaves an empty spot instead of
 * taking down the whole room: the other works stay visible and clickable. Around the whole room, `fallback`
 * replaces a 3D scene that cannot be drawn at all (no WebGL).
 */
export class SlotErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("A museum work could not be drawn", error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
