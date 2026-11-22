"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/locale";
import { listWorkProofs, unwrap, type Proof, type Work } from "@/lib/api";
import { callWithToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { IconSeal } from "@/lib/ui/icons";
import styles from "./work-proofs.module.css";

export interface ShownProof {
  url: string;
  /** A proof only its author and the reviewers may open, through a signed link that lives five minutes. */
  private: boolean;
}

const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const EXTENSION = /\.[a-z0-9]{2,5}$/i;
/** Private links expire after five minutes (artiko-api, signed links): they are read again before that. */
const FRESH_FOR_MS = 4 * 60 * 1000;

const pathOf = (url: string) => url.split(/[?#]/)[0];

/**
 * How a proof is shown. The API does not say what a proof is (image, sound, video, 3D): a public file
 * tells by its extension; a private link has none, so it is tried as a picture and falls back to a
 * numbered tile.
 */
export function proofKind(proof: ShownProof): "picture" | "unknown" | "file" {
  const path = pathOf(proof.url);
  if (IMAGE.test(path)) return "picture";
  return proof.private || !EXTENSION.test(path) ? "unknown" : "file";
}

function ProofTile({ proof, n }: { proof: ShownProof; n: number }) {
  const { t } = useT();
  const [broken, setBroken] = useState(false);
  const kind = proofKind(proof);
  const alt = t("museum.stepAlt", { n });
  return (
    <a href={proof.url} target="_blank" rel="noreferrer" className={styles.tile} data-private={proof.private || undefined}>
      {kind === "file" || broken ? (
        <span className={styles.step}>{t("museum.step", { n })}</span>
      ) : proof.private || kind === "unknown" ? (
        // Never through the image optimizer, which keeps what it fetched: a private link must not be cached.
        <Image src={proof.url} alt={alt} fill sizes="64px" unoptimized referrerPolicy="no-referrer" className={styles.thumb} onError={() => setBroken(true)} />
      ) : (
        <Image src={proof.url} alt={alt} fill sizes="64px" className={styles.thumb} onError={() => setBroken(true)} />
      )}
      {proof.private && <span className={styles.private}>{t("notice.proofPrivate")}</span>}
    </a>
  );
}

/** The block the team built: the seal in words, the proof files, the fingerprint. */
export function ProofBlock({ work, proofs }: { work: Work; proofs: readonly ShownProof[] }) {
  const { t } = useT();
  return (
    <section aria-label={t("museum.proof")} className={styles.block}>
      <p className={styles.eyebrow}>{t("museum.proof")}</p>
      <p className={styles.seal}>
        <IconSeal size={18} strokeWidth={2} />
        {work.human_proven ? t("proof.human") : work.ai_declared ? t("proof.ai") : t("proof.none")}
      </p>
      {proofs.length > 0 && (
        <div className={styles.tiles}>
          {proofs.map((proof, i) => (
            <ProofTile key={proof.url} proof={proof} n={i + 1} />
          ))}
        </div>
      )}
      {proofs.some((proof) => proof.private) && <p className={styles.text}>{t("notice.proofsPrivate")}</p>}
      <p className={styles.text}>
        {t("work.footprint", { hash: work.sha256.slice(0, 12) })} {t("footer.text")}
      </p>
    </section>
  );
}

type Fresh = { workId: string; userId: string; proofs: Proof[] };

/**
 * The proofs of a work. Everyone gets the public ones the page already has. A signed-in person also asks
 * `GET /works/{id}/proofs` from the browser, with their token and without any cache: the author (and a
 * reviewer) then sees the private proofs too, through links that are read again before they expire.
 */
export function WorkProofs({ work }: { work: Work }) {
  const userId = authClient.useSession().data?.user.id ?? null;
  const [fresh, setFresh] = useState<Fresh | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    let readAt = 0;
    let hasPrivate = false;
    const read = async () => {
      readAt = Date.now();
      try {
        const proofs = await callWithToken((auth) => listWorkProofs({ path: { work_id: work.id }, ...auth, cache: "no-store" }).then(unwrap));
        hasPrivate = proofs.some((proof) => proof.visibility !== "public");
        if (live) setFresh({ workId: work.id, userId, proofs });
      } catch {
        // The public proofs of the page stay.
      }
    };
    // Only signed links grow old: public addresses are read once.
    const renew = () => {
      if (hasPrivate && document.visibilityState === "visible" && Date.now() - readAt >= FRESH_FOR_MS) void read();
    };
    void read();
    const timer = window.setInterval(renew, 30_000);
    document.addEventListener("visibilitychange", renew);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", renew);
    };
  }, [userId, work.id]);

  const proofs: ShownProof[] =
    fresh && fresh.workId === work.id && fresh.userId === userId
      ? fresh.proofs.map((proof) => ({ url: proof.url, private: proof.visibility !== "public" }))
      : work.proof_urls.map((url) => ({ url, private: false }));
  return <ProofBlock work={work} proofs={proofs} />;
}
