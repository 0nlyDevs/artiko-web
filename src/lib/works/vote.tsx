"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { ApiError, castVote, unwrap, type Work } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { currentMonth, monthLabel } from "@/lib/months";
import { HeartFilled } from "@/lib/ui/icons";
import { categoryLabel } from "@/lib/works/category-label";
import type { VoteDisabledReason } from "@/lib/works/vote/disabled-reason";
import { signInHref } from "@/lib/works/vote/sign-in-href";
import { canVote as mayVote, voteState, type VoteAnswer, type VoteState } from "@/lib/works/vote/vote-state";
import { identifyVoter, refreshCount, refreshVoter, subscribeVoter, voterServerSnapshot, voterSnapshot } from "@/lib/works/vote/voter-store";
import styles from "@/lib/works/vote/vote-panel.module.css";

export type { VoteState } from "@/lib/works/vote/vote-state";

/** The dictionary line of each reason: the ones the API's own refusals already use (api-messages.ts). */
export const REASON_TEXT: Record<VoteDisabledReason, Key> = {
  not_eligible: "vote.notEligible",
  not_in_contest: "vote.notInContest",
  own_work: "vote.own_work",
  already_voted: "vote.already_voted",
};

/**
 * A work's vote: whether it can be cast, why not when it cannot (known before any click: the work's badge
 * and month, the person's own profile and votes), and `vote()` to cast it. Shared by the notice of a
 * work and the 3D museum. A vote cannot be withdrawn: nothing here undoes one.
 */
export function useVote(work: Work) {
  const { t } = useT();
  const session = authClient.useSession();
  const userId = session.isPending ? undefined : (session.data?.user.id ?? null);
  const store = useSyncExternalStore(subscribeVoter, voterSnapshot, voterServerSnapshot);
  const [pending, startTransition] = useTransition();
  const [answer, setAnswer] = useState<VoteAnswer>(null);

  useEffect(() => {
    if (userId !== undefined) identifyVoter(userId);
  }, [userId]);

  const month = currentMonth();
  // The store may still describe the previous person for one render after a sign-in or a sign-out.
  const voter = userId !== undefined && store.userId === userId ? store.voter : ({ status: "pending" } as const);
  // A session opened before its email address was confirmed: the API refused its token on the two reads,
  // as it would refuse the vote. Said before the click, in the words of that refusal.
  const unverified = voter.status === "unknown" && voter.error?.code === "email_not_verified" ? { blocked: apiErrorText(voter.error, t) } : null;
  const state: VoteState = voteState({ work, month, voter, answer: answer ?? unverified, say: (reason) => t(REASON_TEXT[reason]) });
  const canVote = mayVote(state);

  const vote = () => {
    if (!canVote || pending) return false;
    startTransition(async () => {
      try {
        await callWithToken((auth) => castVote({ body: { work_id: work.id }, ...auth }).then(unwrap));
        setAnswer("done");
        // `POST /votes` returns no count: the person's votes and the work are read again.
        void refreshVoter();
        void refreshCount(work.id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) setAnswer("signin");
        // The API did not answer: the button stays, to try again.
        else if (!(e instanceof ApiError) || e.code === "unreachable") setAnswer({ blocked: t("vote.failed"), retry: true });
        // A known refusal is translated (api-messages.ts); any other API error keeps its own message.
        else {
          setAnswer({ blocked: apiErrorText(e, t) });
          // The vote was cast elsewhere (another tab, the phone): what we hold is stale.
          if (e.code === "already_voted") void refreshVoter();
        }
      }
    });
    return true;
  };

  // The count belongs to the work's month. After a vote it is the page's count plus one, until the re-read answers.
  const votes = Math.max(work.votes + (answer === "done" ? 1 : 0), store.counts[work.id] ?? 0);
  return { state, pending, votes, vote, canVote };
}

export type WorkVote = ReturnType<typeof useVote>;

interface VoteProps {
  work: Work;
  vote: WorkVote;
}

/** Figma « Concours du mois »: the contest of the work's category and month, its count, and the rule. */
export function VoteContest({ work, vote }: VoteProps) {
  const { t, plural, locale } = useT();
  const month = monthLabel(work.month, locale);
  const category = categoryLabel({ id: work.category }, locale);
  return (
    <section className={styles.contest} aria-label={t("vote.contest")}>
      <p className={styles.eyebrow}>{[t("vote.contest"), category, month].join(" · ")}</p>
      <div className={styles.count}>
        <p className={styles.figure}>
          <strong key={vote.votes} className={`${styles.number} ${vote.state === "done" ? "bump" : ""}`}>
            {vote.votes}
          </strong>{" "}
          {/* `votes` is the count of the work's own month, which is not always the current one. */}
          <span className={styles.unit}>
            {work.month === currentMonth() ? plural("vote.count", vote.votes) : plural("vote.countIn", vote.votes, { month })}
          </span>
        </p>
        <p className={styles.rule}>{t("vote.rule")}</p>
      </div>
    </section>
  );
}

interface VoteActionsProps extends VoteProps {
  /** Where the sign-in page sends the visitor back; the notice of the work by default. */
  returnTo?: string;
  /** A second action beside the button, such as « Œuvre suivante ». */
  aside?: ReactNode;
  className?: string;
}

/** The vote button, or what stands in its place, with the reason in words when the vote is closed. */
export function VoteActions({ work, vote, returnTo = `/works/${work.id}`, aside, className }: VoteActionsProps) {
  const { t, rich } = useT();
  const noteId = useId();
  const { state, pending } = vote;
  const blocked = typeof state === "object" ? state : null;
  const closed = blocked !== null && !blocked.retry;

  return (
    <div className={[styles.actions, className].filter(Boolean).join(" ")}>
      <div className={styles.buttons}>
        {state === "done" ? (
          <p role="status" className={styles.done}>
            <HeartFilled size={20} className={`pop ${styles.heart}`} />
            {t("vote.done")}
          </p>
        ) : state === "signin" ? (
          <Link href={signInHref(returnTo)} className={`${styles.button} ${styles.primary}`} aria-describedby={noteId}>
            {t("vote.signInCta")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={vote.vote}
            disabled={closed || state === "checking" || pending}
            aria-busy={state === "checking" || pending || undefined}
            aria-describedby={blocked || state === "checking" ? noteId : undefined}
            className={`${styles.button} ${styles.primary}`}
          >
            {pending && <span className={styles.spinner} aria-hidden="true" />}
            {pending ? t("vote.voting") : t("vote.cta")}
          </button>
        )}
        {aside}
      </div>
      {state === "signin" && (
        <p id={noteId} className={styles.note}>
          {rich("vote.signIn", { link: (text) => text })}
        </p>
      )}
      {state === "checking" && (
        <p id={noteId} className="visually-hidden">
          {t("vote.checking")}
        </p>
      )}
      {blocked && (
        // Known before the click, the reason is part of the page; said after a click, it is announced.
        <p id={noteId} role={blocked.reason ? undefined : "alert"} className={styles.reason} data-reason={blocked.reason}>
          {blocked.blocked}
        </p>
      )}
    </div>
  );
}

/** Count, then the button or the reason it is closed. */
export function VotePanel({ work, vote, returnTo }: VoteProps & { returnTo?: string }) {
  return (
    <div className={styles.panel}>
      <VoteContest work={work} vote={vote} />
      <VoteActions work={work} vote={vote} returnTo={returnTo} />
    </div>
  );
}
