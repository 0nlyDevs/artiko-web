"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, currentMonth, type Work } from "@/lib/api";
import { authedApi } from "@/lib/api-client";

const REFUSED: Record<string, string> = {
  already_voted: "You already voted in this category this month.",
  own_work: "You cannot vote for your own work.",
  not_eligible: "Only works with proof of process can receive votes.",
  not_in_contest: "Only works published this month can receive votes.",
};

export function VoteButton({ work, onVoted }: { work: Work; onVoted: () => void }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "signin" | { error: string }>("idle");

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

  async function vote() {
    setState("sending");
    try {
      await authedApi("/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_id: work.id }),
      });
      setState("done");
      onVoted();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return setState("signin");
      setState({ error: e instanceof ApiError ? (REFUSED[e.code] ?? e.message) : "The vote did not go through. Try again." });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={vote}
        disabled={state === "sending"}
        className="self-start bg-accent px-5 py-3 font-bold text-ink disabled:opacity-60"
      >
        {state === "sending" ? "Voting" : "Vote for this work"}
      </button>
      {typeof state === "object" && (
        <p role="alert" className="text-red">
          {state.error}
        </p>
      )}
    </div>
  );
}
