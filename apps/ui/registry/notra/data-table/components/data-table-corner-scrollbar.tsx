"use client";

import { useEffect, useRef } from "react";

import {
  CORNER_SCROLLBAR_GAP_PX,
  CORNER_SCROLLBAR_IDLE_MS,
  CORNER_SCROLLBAR_MIN_THUMB_PX,
  TABLE_BODY_RADIUS_PX,
} from "../constants/data-table";
import type { TableCornerScrollbarProps } from "../types/data-table";

/**
 * Straight scrollbar thumb along the card's right edge. While it is visible
 * and runs into the top or bottom corner, it flags that corner on the
 * wrapper (`data-corner-start` / `data-corner-end`) so the card can tighten
 * its radius around the thumb instead of clipping it. Size and offset come
 * from `CORNER_SCROLLBAR_VARS` on the table frame.
 */
export function TableCornerScrollbar({
  scrollRef,
  wrapperRef,
}: TableCornerScrollbarProps) {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    const wrapper = wrapperRef.current;
    const thumb = thumbRef.current;
    if (!(element && wrapper && thumb)) {
      return;
    }
    let travel = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let hovered = false;
    let scrolling = false;
    let dragging = false;

    const update = () => {
      const scrollable = element.scrollHeight - element.clientHeight;
      const visible = scrollable > 1 && (hovered || scrolling || dragging);
      wrapper.dataset.thumb = visible ? "visible" : "hidden";
      if (scrollable <= 1) {
        wrapper.dataset.cornerStart = "false";
        wrapper.dataset.cornerEnd = "false";
        return;
      }
      const track = element.offsetHeight - CORNER_SCROLLBAR_GAP_PX * 2;
      const length = Math.min(
        track,
        Math.max(
          CORNER_SCROLLBAR_MIN_THUMB_PX,
          (element.clientHeight / element.scrollHeight) * track
        )
      );
      travel = track - length;
      const progress = Math.min(1, Math.max(0, element.scrollTop / scrollable));
      const top = CORNER_SCROLLBAR_GAP_PX + progress * travel;
      thumb.style.height = `${length}px`;
      thumb.style.transform = `translateY(${top}px)`;
      // A thumb end inside the corner's radius would be clipped by the curve.
      wrapper.dataset.cornerStart = String(
        visible && top < TABLE_BODY_RADIUS_PX
      );
      wrapper.dataset.cornerEnd = String(
        visible && top + length > element.offsetHeight - TABLE_BODY_RADIUS_PX
      );
    };

    const handleScroll = () => {
      scrolling = true;
      update();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        scrolling = false;
        update();
      }, CORNER_SCROLLBAR_IDLE_MS);
    };
    const handlePointerEnter = () => {
      hovered = true;
      update();
    };
    const handlePointerLeave = () => {
      hovered = false;
      update();
    };

    // Dragging maps pointer travel along the track back to scroll distance.
    // Pointer capture keeps move/up on the thumb, so the listeners can stay.
    let dragStartY = 0;
    let dragStartScroll = 0;
    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
      dragStartY = event.clientY;
      dragStartScroll = element.scrollTop;
      dragging = true;
      update();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging || travel <= 0) {
        return;
      }
      element.scrollTop =
        dragStartScroll +
        ((event.clientY - dragStartY) / travel) *
          (element.scrollHeight - element.clientHeight);
    };
    const handlePointerUp = () => {
      dragging = false;
      update();
    };

    update();
    element.addEventListener("scroll", handleScroll, { passive: true });
    wrapper.addEventListener("pointerenter", handlePointerEnter);
    wrapper.addEventListener("pointerleave", handlePointerLeave);
    thumb.addEventListener("pointerdown", handlePointerDown);
    thumb.addEventListener("pointermove", handlePointerMove);
    thumb.addEventListener("pointerup", handlePointerUp);
    thumb.addEventListener("pointercancel", handlePointerUp);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const table = element.querySelector("table");
    if (table) {
      observer.observe(table);
    }
    return () => {
      clearTimeout(idleTimer);
      observer.disconnect();
      element.removeEventListener("scroll", handleScroll);
      wrapper.removeEventListener("pointerenter", handlePointerEnter);
      wrapper.removeEventListener("pointerleave", handlePointerLeave);
      thumb.removeEventListener("pointerdown", handlePointerDown);
      thumb.removeEventListener("pointermove", handlePointerMove);
      thumb.removeEventListener("pointerup", handlePointerUp);
      thumb.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [scrollRef, wrapperRef]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-(--corner-scrollbar-gap) z-20 w-(--corner-scrollbar-width) rounded-full bg-[color-mix(in_oklab,var(--foreground)_22%,transparent)] opacity-0 transition-[opacity,background-color] duration-200 group-data-[thumb=visible]/table-body:pointer-events-auto group-data-[thumb=visible]/table-body:opacity-100 hover:bg-[color-mix(in_oklab,var(--foreground)_35%,transparent)] active:bg-[color-mix(in_oklab,var(--foreground)_45%,transparent)] motion-reduce:transition-none"
      ref={thumbRef}
    />
  );
}
