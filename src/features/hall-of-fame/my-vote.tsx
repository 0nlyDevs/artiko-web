"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HallOfFameEntry } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { IconCheck } from "@/lib/ui/icons";
import styles from "./hall-of-fame.module.css";
import { loadMyVote, type MyVote } from "./load-my-vote";

/**
 * « Votre vote » of the bottom bar: the work the signed-in person voted for in this room, which opens its notice.
 * Nothing is drawn for a visitor, for a person who has not voted here, or when the answer does not come.
 */
export function MyVoteNote({ category, month, entries }: { category: string; month: string; entries: HallOfFameEntry[] }) {
  const signedIn = Boolean(authClient.useSession().data);
  const [vote, setVote] = useState<MyVote | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    loadMyVote(category, month, entries).then(
      (found) => {
        if (live) setVote(found);
      },
      () => {
        // The reminder is a comfort: without an answer the room stays as it is.
      },
    );
    return () => {
      live = false;
    };
  }, [signedIn, category, month, entries]);

  return signedIn && vote ? <MyVoteView vote={vote} /> : null;
}

/** The note itself. The title is cut with an ellipsis when the bar is short of room: the link carries it whole. */
export function MyVoteView({ vote }: { vote: MyVote }) {
  const { t } = useT();
  const text = vote.title === null ? t("hall.myVoteUntitled") : t("hall.myVote", { title: vote.title });
  return (
    <Link href={`/works/${vote.workId}`} className={styles.myVote} title={text}>
      <span className={styles.myVoteText}>{text}</span>
      <IconCheck size={16} strokeWidth={2} />
    </Link>
  );
}
