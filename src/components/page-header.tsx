import type { ReactNode } from "react";

import { PageBarIcon } from "./page-bar-icon";

export type PageHeaderProps = {
  title: ReactNode;
  /** A line or two under the bar that says what the screen is for. */
  description?: ReactNode;
  /** Buttons or status at the bar's right end, e.g. "Saved just now" and a primary action. */
  actions?: ReactNode;
  /** Before the title, e.g. a breadcrumb back to the list. Replaces the section's icon. */
  before?: ReactNode;
};

/**
 * The bar across the top of every signed-in screen: the
 * section's icon, the screen's title and its actions, staying in view while
 * the page scrolls. The description, if any, sits under it.
 */
export function PageHeader({ title, description, actions, before }: PageHeaderProps) {
  return (
    <>
      <PageBar>
        <div className="flex min-w-0 items-center gap-3">
          {before ?? <PageBarIcon />}
          <h1 className="font-serif text-title text-pretty max-md:text-[28px]">{title}</h1>
        </div>
        {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </PageBar>
      {/* The screen's content starts 32px under the bar (20px on a phone), after the description if there is one. */}
      {description ? (
        <p className="max-w-[620px] px-(--page-gutter) pt-1 pb-6 text-lead text-pretty text-muted md:pb-8">{description}</p>
      ) : (
        <div aria-hidden="true" className="h-5 md:h-8" />
      )}
    </>
  );
}

/**
 * The bar itself, for screens that fill it some other way (a loading
 * skeleton, an error). Sticks to the top of the window; the shell's colour
 * behind it fills its rounded corners, so the page doesn't show through.
 * On a phone the panel fills the window, so the bar is flat and tighter, and
 * scrolls away with the page: it can be three rows tall there.
 */
export function PageBar({ children }: { children: ReactNode }) {
  return (
    // md:-mx-px: over the panel's side borders, so the bar's own line up with them.
    // md:pt-2: the shell's 8px above the panel, as at its sides and bottom; it
    // stays while the bar sticks, so nothing scrolls by above it.
    <div className="bg-surface md:sticky md:top-0 md:z-20 md:-mx-px md:bg-paper md:pt-2">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-surface px-(--page-gutter) pt-4 pb-3 md:rounded-t-panel md:border md:border-b-0 md:border-line-card md:pt-7 md:pb-4">
        {children}
      </div>
    </div>
  );
}
