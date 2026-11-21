"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { ApiError, castVote, unwrap, withToken, type Work } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";
import { currentMonth } from "@/lib/months";
import { HeartFilled, IconHeart } from "@/lib/ui/icons";

const REFUSED: Record<string, Key> = {
  already_voted: "vote.already_voted",
  own_work: "vote.own_work",
  not_eligible: "vote.notEligible",
  not_in_contest: "vote.notInContest",
  email_not_verified: "vote.emailNotVerified",
};

export type VoteState = "open" | "done" | "signin" | { blocked: string };

/** A work's vote: whether it can still be cast, and `vote()` to cast it. Shared by the work page and the 3D museum. */
export function useVote(work: Work) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<VoteState>("open");
  const eligible = work.human_proven && work.month === currentMonth();
  const shown: VoteState = eligible ? state : { blocked: t(work.human_proven ? "vote.notInContest" : "vote.notEligible") };

  const vote = () => {
    if (shown !== "open" || pending) return false;
    startTransition(async () => {
      try {
        unwrap(await castVote({ body: { work_id: work.id }, ...withToken(await getApiToken()) }));
        setState("done");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) setState("signin");
        // A known refusal is translated; any other API error keeps its own message.
        else if (e instanceof ApiError) setState({ blocked: e.code in REFUSED ? t(REFUSED[e.code]) : e.message });
        else setState({ blocked: t("vote.failed") });
      }
    });
    return true;
  };

  return { state: shown, pending, votes: work.votes + (state === "done" ? 1 : 0), vote };
}

/** Count, then the button or the reason it is closed. */
export function VotePanel({ work, vote }: { work: Work; vote: ReturnType<typeof useVote> }) {
  const { t, plural, rich } = useT();
  const { state, pending, votes } = vote;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p>
          <strong key={votes} className={`text-[22px] font-extrabold ${state === "done" ? "bump" : ""}`}>
            {plural("votes", votes)}
          </strong>{" "}
          {t("vote.thisMonth")}
        </p>
        <p className="text-sm text-muted">{t(`category.${work.category}` as Key)}</p>
      </div>
      {state === "open" && (
        <>
          <button type="button" onClick={vote.vote} disabled={pending} className="btn btn-vote min-h-[52px] w-full">
            {pending ? <span className="spin" aria-hidden="true" /> : <IconHeart size={22} strokeWidth={2} />}
            {pending ? t("vote.voting") : t("vote.cta")}
          </button>
          <p className="text-sm text-muted">{t("vote.rule")}</p>
        </>
      )}
      {state === "done" && (
        <p role="status" className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#FBE9E3] px-4 text-center font-bold text-[#8E3524]">
          <HeartFilled size={22} className="pop shrink-0 text-red" />
          {t("vote.done")}
        </p>
      )}
      {state === "signin" && (
        <>
          <Link href="/sign-in" className="btn btn-ink min-h-[52px] w-full">
            {t("vote.signInCta")}
          </Link>
          <p className="text-sm text-muted">{rich("vote.signIn", { link: (text) => text })}</p>
        </>
      )}
      {typeof state === "object" && (
        <>
          <button type="button" disabled className="btn btn-soft min-h-[52px] w-full">
            {t("vote.cta")}
          </button>
          <p role="alert" className="text-sm leading-relaxed">
            {state.blocked}
          </p>
        </>
      )}
    </div>
  );
}
