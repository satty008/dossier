"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { SavedIndicator } from "@/components/saved-indicator";
import { SectionPicker } from "@/components/section-picker";
import { TrackSaveContext, useSaveTracker } from "@/components/save-tracker";
import { cn } from "@/lib/cn";

import { SETTINGS_SECTIONS, settingsSectionHref, type SettingsSectionId } from "./sections";

/**
 * The Settings frame (E10-1): the section list on the left, the section on
 * the right, stacked on narrow windows, where the list folds into one row.
 * Every control saves on its own; the header says when it's done.
 */
export function SettingsScreen({ section, children }: { section: SettingsSectionId; children: ReactNode }) {
  const saves = useSaveTracker();

  return (
    <TrackSaveContext value={saves.track}>
      <PageHeader
        title="Settings"
        description="It's your server, so it's your call. Choose which AI writes for you, set your document defaults, and take your data with you whenever you like."
        actions={<SavedIndicator status={saves.status} savedAt={saves.savedAt} />}
      />
      <div className="flex flex-wrap items-start gap-x-12 gap-y-8 px-(--page-gutter) pb-20">
        <SectionPicker
          label="Section"
          current={SETTINGS_SECTIONS.find((entry) => entry.id === section)?.label ?? "Settings"}
          className="max-w-[220px] min-w-[200px] flex-[1_1_200px] max-md:max-w-none"
        >
          <nav aria-label="Settings sections" className="flex flex-col gap-0.5">
            {SETTINGS_SECTIONS.map((entry) => (
              <Link
                key={entry.id}
                href={settingsSectionHref(entry.id)}
                aria-current={entry.id === section ? "page" : undefined}
                className={cn(
                  "rounded-control px-3 py-[9px] text-sm text-ink hover:bg-hover hover:text-ink max-md:py-3",
                  entry.id === section && "bg-selected font-medium hover:bg-selected",
                )}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </SectionPicker>
        <div className="flex max-w-[760px] min-w-0 flex-[999_1_420px] flex-col gap-5">{children}</div>
      </div>
    </TrackSaveContext>
  );
}

/** A section's title and introduction. */
export function SettingsSectionIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-serif text-section">{title}</h2>
      {children && <p className="text-sm text-pretty text-muted">{children}</p>}
    </div>
  );
}
