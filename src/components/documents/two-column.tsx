import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { ContactEntry, ContactKind, PersonalDetail } from "@/lib/resume-content";
import { skillLine } from "@/lib/skill-groups";

import { contactHref } from "@/lib/web-link";

import { ContactIcon } from "./contact-icons";
import { ContactDetail } from "./document-page";
import styles from "./document.module.css";

// The parts of the two-column layouts (ThemeLayout.TWO_COLUMN, and the one
// with compact roles) that aren't the other layouts' with another style:
// their header, an entry's head with the dates and place beside it, and
// their rows of skills.

/** The order the template lists contact details in, after the place on a line of its own. */
const CONTACT_ORDER: readonly ContactKind[] = ["age", "phone", "email", "website", "linkedin"];

/** "Jane Maria Doe" as the template sets it: the last word in bold, the ones before it in a thin accent. */
export function splitName(name: string): { first: string; last: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length < 2 ? { first: "", last: words[0] ?? "" } : { first: words.slice(0, -1).join(" "), last: words[words.length - 1] };
}

/**
 * The name, the headline in small caps, the place on a line of its own and
 * the other contact details after it, each with its icon and a bar between
 * them, then the personal details on a line of small print, all centred; the
 * photo, if there is one, is in the top corner.
 */
export function TwoColumnHeader({
  name,
  headline,
  address,
  entries,
  personal,
  photo,
}: {
  name: string;
  headline: string;
  /** The line with the place's icon: the street address, city and country, or what there is of them. */
  address: string;
  entries: ContactEntry[];
  /** The line under the contacts, "Date of birth: 08.11.1989 | Driving licence: Class B". */
  personal: PersonalDetail[];
  photo: ReactNode;
}) {
  const { first, last } = splitName(name);
  const contacts = entries
    .filter((entry) => entry.kind !== "location")
    .sort((a, b) => CONTACT_ORDER.indexOf(a.kind) - CONTACT_ORDER.indexOf(b.kind));
  return (
    <header className={cn(styles.header, styles.twoColumnHeader, photo ? styles.headerWithCorner : undefined)}>
      <h1 className={styles.name}>
        {first && (
          <>
            <span className={styles.nameFirst}>{first}</span>{" "}
          </>
        )}
        <span className={styles.nameLast}>{last}</span>
      </h1>
      {headline && <p className={styles.headline}>{headline}</p>}
      {address && (
        <p className={styles.address}>
          <HeaderContact entry={{ kind: "location", text: address }} />
        </p>
      )}
      {contacts.length > 0 && (
        <p className={styles.contactLine}>
          {contacts.map((entry, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <span aria-hidden="true" className={styles.bar}>
                  |
                </span>
              )}
              <HeaderContact entry={entry} name={name} />
            </Fragment>
          ))}
        </p>
      )}
      {personal.length > 0 && (
        <p className={styles.personalLine}>
          {personal.map((detail, index) => (
            <Fragment key={detail.kind}>
              {index > 0 && (
                <span aria-hidden="true" className={styles.personalBar}>
                  |
                </span>
              )}
              <span className={styles.personal}>{`${detail.label}: ${detail.value}`}</span>
            </Fragment>
          ))}
        </p>
      )}
      {photo}
    </header>
  );
}

/**
 * What the template prints beside a contact detail's icon: the person's name for
 * their LinkedIn, and just the handle for a profile on GitHub or GitLab; the icon
 * says where, and the link still opens the address. Anything else as it is.
 */
export function headerContactText({ kind, text }: ContactEntry, name: string): string {
  if (kind === "linkedin") return name.trim() || text;
  if (kind === "website") {
    const [host, handle] = text.split(/[/?#]/);
    if (handle && ["github.com", "gitlab.com"].includes(host.toLowerCase())) return handle;
  }
  return text;
}

function HeaderContact({ entry, name = "" }: { entry: ContactEntry; name?: string }) {
  return (
    <span className={styles.contact}>
      <ContactIcon entry={entry} />
      <ContactDetail href={contactHref(entry.text)}>{headerContactText(entry, name)}</ContactDetail>
    </span>
  );
}

/** The photo (#224) in the top corner, a little into the margin, drawn under what overlaps it. */
export function CornerPhoto({ src, name }: { src: string; name: string }) {
  return (
    // A data URL drawn as it is, in the preview and in the PDF: there's nothing for next/image to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className={styles.photoCorner} />
  );
}

/**
 * An entry's head: its dates, and where it was, in the column before it, and
 * its title with the company or school under it. (`dates` can already break
 * where a narrow column needs.)
 */
export function ColumnEntryHead({ title, at, dates, place }: { title: string; at: ReactNode; dates: string; place: string }) {
  return (
    <div className={styles.entryHead}>
      {(dates || place) && (
        <div className={styles.entryMeta}>
          {dates && <span className={styles.metaDates}>{dates}</span>}
          {place && <span className={styles.metaPlace}>{place}</span>}
        </div>
      )}
      <p className={styles.columnTitle}>
        <span className={styles.entryTitle}>{title}</span>
        {at && <span className={styles.entryAt}>{at}</span>}
      </p>
    </div>
  );
}

/**
 * A name that can wrap after a slash, so a long "Hindi/Bengali/Tamil" in the
 * narrow column breaks between the names, not inside one. The text is the same.
 */
function wrapAfterSlashes(name: string): ReactNode {
  const parts = name.split("/");
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index < parts.length - 1 ? `${part}/` : part}
      {index < parts.length - 1 && <wbr />}
    </Fragment>
  ));
}

/**
 * Lines of "Group: Skill · Skill" as rows of two: the group's name, then its
 * skills with commas between them. A line without a group's name is as wide
 * as both. `separator` is what splits the text into lines: a new line for
 * skills, " · " for languages.
 */
export function SkillRows({ text, separator = "\n" }: { text: string; separator?: string }) {
  return text
    .split(separator)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const { label, text: skills } = skillLine(line);
      const items = skills.replaceAll(" · ", ", ");
      return label ? (
        <p key={index} className={styles.skillLine}>
          <strong className={styles.skillLabel}>{wrapAfterSlashes(label)}</strong>
          <span className={styles.skillItems}>{items}</span>
        </p>
      ) : (
        <p key={index} className={cn(styles.skillLine, styles.skillBare)}>
          {items}
        </p>
      );
    });
}
