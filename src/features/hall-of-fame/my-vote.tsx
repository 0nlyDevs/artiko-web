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
  const { t } = useT();
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

  if (!signedIn || !vote) return null;
  return (
    <Link href={`/works/${vote.workId}`} className={styles.myVote}>
      <span>{vote.title === null ? t("hall.myVoteUntitled") : t("hall.myVote", { title: vote.title })}</span>
      <IconCheck size={16} strokeWidth={2} />
    </Link>
  );
}
