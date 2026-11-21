"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, castVote, unwrap, withToken, type Work } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";
import { currentMonth } from "@/lib/months";

const REFUSED = { already_voted: "vote.already_voted", own_work: "vote.own_work", not_eligible: "vote.notEligible", not_in_contest: "vote.notInContest" } as const;

export function VoteButton({ work, onVoted }: { work: Work; onVoted: () => void }) {
  const { t, rich } = useT();
  const [pending, startTransition] = useTransition();
  // A known refusal code is translated; any other API error keeps its own message; no ApiError means the request failed.
  const [state, setState] = useState<"idle" | "done" | "signin" | { error: ApiError | null }>("idle");

  if (!work.human_proven || work.month !== currentMonth()) return <p>{t(work.human_proven ? "vote.notInContest" : "vote.notEligible")}</p>;
  if (state === "done") return <p className="font-bold">{t("vote.done")}</p>;
  if (state === "signin")
    return (
      <p>
        {rich("vote.signIn", {
          link: (text) => (
            <Link href="/sign-in" className="font-bold underline underline-offset-4">
              {text}
            </Link>
          ),
        })}
      </p>
    );

  const vote = () =>
    startTransition(async () => {
      try {
        unwrap(await castVote({ body: { work_id: work.id }, ...withToken(await getApiToken()) }));
        setState("done");
        onVoted();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) setState("signin");
        else setState({ error: e instanceof ApiError ? e : null });
      }
    });

  const message = (error: ApiError | null) => {
    if (!error) return t("vote.failed");
    return error.code in REFUSED ? t(REFUSED[error.code as keyof typeof REFUSED]) : error.message;
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={vote}
        disabled={pending}
        className="self-start bg-red px-5 py-3 font-bold text-ink disabled:opacity-60"
      >
        {pending ? t("vote.voting") : t("vote.cta")}
      </button>
      {typeof state === "object" && (
        <p role="alert" className="border-l-4 border-red pl-3">
          {message(state.error)}
        </p>
      )}
    </div>
  );
}
