"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ApiError, castVote, unwrap, withToken, type Work } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";
import { currentMonth } from "@/lib/months";

const REFUSED: Record<string, string> = {
  already_voted: "You already voted in this category this month.",
  own_work: "You cannot vote for your own work.",
  not_eligible: "Only works with proof of process can receive votes.",
  not_in_contest: "Only works published this month can receive votes.",
};

export function VoteButton({ work, onVoted }: { work: Work; onVoted: () => void }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "signin" | { error: string }>("idle");

  if (!work.human_proven || work.month !== currentMonth())
    return <p>{work.human_proven ? REFUSED.not_in_contest : REFUSED.not_eligible}</p>;
  if (state === "done") return <p className="font-bold">Your vote is counted. Thank you.</p>;
  if (state === "signin")
    return (
      <p>
        <Link href="/sign-in" className="font-bold underline underline-offset-4">
          Sign in to vote
        </Link>
        . One vote per person, per category, each month.
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
        else setState({ error: e instanceof ApiError ? (REFUSED[e.code] ?? e.message) : "The vote did not go through." });
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={vote}
        disabled={pending}
        className="self-start bg-red px-5 py-3 font-bold text-ink disabled:opacity-60"
      >
        {pending ? "Voting" : "Vote for this work"}
      </button>
      {typeof state === "object" && (
        <p role="alert" className="border-l-4 border-red pl-3">
          {state.error}
        </p>
      )}
    </div>
  );
}
