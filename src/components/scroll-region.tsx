"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A box that scrolls sideways when what's in it is wider (a chart, a table, on
 * a phone). Where it does, its right edge fades out until it's scrolled to the
 * end, so it's seen that there's more; a keyboard reaches it with Tab and
 * scrolls it with the arrow keys, and it's named for a screen reader. Where it
 * doesn't scroll (most screens), it's a plain box, not a tab stop to get past.
 * `label` names what's in it.
 */
export function ScrollRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      setScrolls(element.scrollWidth > element.clientWidth);
      // A pixel of slack: scroll positions are fractions on a zoomed screen.
      setMore(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    };
    // It looks once when it starts watching, and again when the box or what's in it changes size, or it's scrolled.
    const watcher = new ResizeObserver(measure);
    watcher.observe(element);
    for (const child of element.children) watcher.observe(child);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      watcher.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <div
      ref={box}
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? "region" : undefined}
      aria-label={scrolls ? label : undefined}
      className={cn("relative overflow-x-auto", scrolls && more && "mask-r-from-[calc(100%-2rem)]", className)}
    >
      {children}
    </div>
  );
}
