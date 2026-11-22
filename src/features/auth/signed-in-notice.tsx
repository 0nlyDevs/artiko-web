"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { Notice } from "@/features/auth/fields";
import styles from "./account.module.css";

/** Told to a visitor who opens a door while a session is already open: the way to my space. */
export function SignedInNotice() {
  const { t } = useT();
  const user = authClient.useSession().data?.user;
  if (!user) return null;
  return (
    <Notice tone="info">
      {t("account.signedIn", { name: user.name || user.email })}{" "}
      <Link href="/me" className={styles.noticeAction}>
        {t("nav.mySpace")}
      </Link>
    </Notice>
  );
}
