"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { createContext, use, useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

/**
 * Tabs following the WAI-ARIA pattern: Tab moves into and out of the tab
 * list, the arrow keys move between tabs, and a tab's panel shows when it's
 * focused. Built on Radix Tabs; use `value`/`onValueChange` to control it.
 */
export const Tabs = TabsPrimitive.Root;

type TabsVariant = "underline" | "segmented";

const VariantContext = createContext<TabsVariant>("underline");

export type TabsListProps = TabsPrimitive.TabsListProps & {
  /** `underline` for page tabs, `segmented` for tabs inside a panel. */
  variant?: TabsVariant;
};

export function TabsList({ variant = "underline", className, ...props }: TabsListProps) {
  const list = useRef<HTMLDivElement>(null);

  // Tabs that scroll sideways (on a phone) bring the open one into view, as when a link opens the last of them. Only the list moves, never the page.
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const reveal = () => {
      const active = element.querySelector<HTMLElement>('[data-state="active"]');
      if (!active || element.scrollWidth <= element.clientWidth) return;
      const bounds = element.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      if (tab.left < bounds.left || tab.right > bounds.right) element.scrollBy({ left: tab.left - bounds.left - 16 });
    };
    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(element, { attributes: true, attributeFilter: ["data-state"], subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <VariantContext value={variant}>
      <TabsPrimitive.List
        ref={list}
        className={cn(
          "flex",
          variant === "underline"
            ? // Wrapping from 768px up. Narrower, the tabs scroll sideways in one row; the line under them is a shadow, so the active tab's underline isn't clipped by the scrolling.
              "flex-wrap gap-x-7 border-b border-line max-md:flex-nowrap max-md:gap-x-5 max-md:overflow-x-auto max-md:border-b-0 max-md:shadow-[inset_0_-1px_0_var(--color-line)]"
            : "rounded-[10px] bg-track p-[3px]",
          className,
        )}
        {...props}
      />
    </VariantContext>
  );
}

const triggerClassNames: Record<TabsVariant, string> = {
  underline:
    "-mb-px border-b-2 border-transparent pt-2.5 pb-[13px] text-sm text-muted hover:text-ink data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-ink max-md:mb-0 max-md:shrink-0 max-md:whitespace-nowrap",
  segmented:
    "flex-1 rounded-control p-2 text-control font-medium data-[state=active]:bg-card data-[state=active]:shadow-raised",
};

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  const variant = use(VariantContext);
  return (
    <TabsPrimitive.Trigger
      className={cn(
        triggerClassNames[variant],
        "disabled:cursor-not-allowed disabled:text-faint",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return <TabsPrimitive.Content className={cn("outline-offset-4", className)} {...props} />;
}
