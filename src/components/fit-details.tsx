import { fitBand, type PostingFit } from "@/lib/fit";

import { ScoreBadge } from "./score-badge";

/**
 * A posting's score (#208): its band, why it fits, and what gives pause. Find jobs and New application (public issue 66) show it.
 *
 * The reasons and worries run up to 300 characters each, so on a phone they take the card's whole width, under the score; from
 * `sm` up they sit beside it. The space between them is margin, not a grid gap, so a card without worries has no empty row.
 */
export function FitDetails({ fit }: { fit: PostingFit }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 rounded-card border border-line-card bg-paper px-4 py-3.5 text-sm sm:items-start">
      <div className="sm:row-span-3">
        <ScoreBadge score={fit.score} />
      </div>
      <p className="font-medium">
        {fitBand(fit.score)} · {fit.score} of 100
      </p>
      {fit.reasons.length > 0 && (
        <ul aria-label="Why it fits" className="col-span-2 mt-2.5 flex list-disc flex-col gap-0.5 pl-5 text-muted sm:col-span-1 sm:mt-1.5">
          {fit.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}
      {fit.redFlags.length > 0 && (
        <div className="col-span-2 mt-2.5 text-meta text-warning sm:col-span-1 sm:mt-1.5">
          <p className="font-medium">Worth knowing</p>
          <ul className="flex list-disc flex-col gap-0.5 pl-5">
            {fit.redFlags.map((flag, index) => (
              <li key={index}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
