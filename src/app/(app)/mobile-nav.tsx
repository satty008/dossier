"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { isCurrent, MOBILE_TABS, mobileTabs } from "@/lib/nav";

/** From here up the sidebar is shown instead (Tailwind's `md`). */
const SIDEBAR_QUERY = "(min-width: 48rem)";

// min-w-0: five tabs share the width, which at 320px is less than "Applications" needs at 11px.
const TAB = "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium max-[350px]:text-[10px]";

/**
 * Navigation on a phone: the sections used most in a bar at the bottom of the
 * screen, where a thumb reaches, and a Menu that opens everything the sidebar
 * holds (the other sections, the theme, the account) over the page. From
 * 768px up the sidebar is there instead and this is hidden.
 *
 * `children` is the sidebar's body, the same one the sidebar shows, so the
 * menu can't drift from it. The menu closes when the page changes, whether by
 * one of its links or by Back.
 */
export function MobileNav({
  brand,
  counts,
  children,
}: {
  /** The logo and name, at the top of the menu. */
  brand: ReactNode;
  /** Badges by section, e.g. replies waiting in the inbox. */
  counts?: Record<string, number>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  // A window widened past the point where the sidebar takes over (a tablet turned sideways) leaves nothing to show it in.
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const wide = matchMedia(SIDEBAR_QUERY);
    const close = (event: MediaQueryListEvent) => event.matches && setOpen(false);
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, []);

  const tabs = mobileTabs();
  // The Menu stands for every section the bar doesn't show, so it's marked while one of them is open.
  const inMenu = !tabs.some((item) => isCurrent(item, pathname));
  // What waits in a section only the menu has (the agent's finds), so it isn't missed.
  const hidden = Object.entries(counts ?? {}).reduce((sum, [href, count]) => sum + ((MOBILE_TABS as readonly string[]).includes(href) ? 0 : count), 0);

  // A link to the page already open changes no path, so the menu is closed by the click.
  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <nav
        aria-label="Main"
        data-mobile-nav=""
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex">
          {tabs.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isCurrent(item, pathname);
            const count = counts?.[href];
            return (
              <li key={href} className="flex min-w-0 flex-1">
                <Link href={href} aria-current={active ? "page" : undefined} className={cn(TAB, active ? "text-ink" : "text-muted")}>
                  <span className={cn("relative grid h-7 w-14 place-items-center rounded-full motion-safe:transition-colors", active && "bg-selected")}>
                    <Icon size={20} aria-hidden="true" />
                    {count ? (
                      <span aria-hidden="true" className="absolute top-0 right-1 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-on-primary">
                        {count}
                      </span>
                    ) : null}
                  </span>
                  {label}
                  {count ? <span className="sr-only"> {count} waiting</span> : null}
                </Link>
              </li>
            );
          })}
          <li className="flex min-w-0 flex-1">
            <Dialog.Trigger className={cn(TAB, inMenu ? "text-ink" : "text-muted")}>
              <span className={cn("relative grid h-7 w-14 place-items-center rounded-full motion-safe:transition-colors", inMenu && "bg-selected")}>
                <Menu size={20} aria-hidden="true" />
                {hidden > 0 && <span aria-hidden="true" className="absolute top-0.5 right-3.5 size-2 rounded-full bg-primary" />}
              </span>
              Menu
              {hidden > 0 && <span className="sr-only"> ({hidden} waiting)</span>}
            </Dialog.Trigger>
          </li>
        </ul>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={closeOnLink}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(320px,calc(100vw-48px))] flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r border-line bg-sidebar shadow-menu motion-safe:animate-drawer-in md:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex items-center justify-between gap-2 border-b border-line py-3 pr-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">{brand}</div>
            <Dialog.Close
              aria-label="Close menu"
              className="grid size-11 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink"
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
