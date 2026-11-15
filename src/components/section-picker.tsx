"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The list of a screen's sections (Profile's, Settings') that on a phone folds
 * into one row naming the current section, so the section itself is what's on
 * the screen rather than a long list above it. Choosing a section closes it
 * again. From 768px up the list is always open and the row isn't there.
 */
export function SectionPicker({
  label,
  current,
  className,
  children,
}: {
  /** What the sections are, e.g. "Section". */
  label: string;
  /** The name of the section that's open. */
  current: string;
  className?: string;
  /** The list: its links go to the sections. */
  children: ReactNode;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(current);
  if (shown !== current) {
    setShown(current);
    setOpen(false);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-line-control bg-input px-3 text-left text-sm shadow-control md:hidden"
      >
        <span className="min-w-0 truncate">
          <span className="text-muted">{label}: </span>
          <span className="font-medium">{current}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={cn("shrink-0 text-muted motion-safe:transition-transform", open && "rotate-180")} />
      </button>
      <div id={listId} className={cn("flex flex-col gap-6", !open && "max-md:hidden")}>
        {children}
      </div>
    </div>
  );
}
