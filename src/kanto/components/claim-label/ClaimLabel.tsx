import type {
  ClaimStatus,
  PublicationStatus,
  ReviewState,
} from '../../lib/api/types';
import { cx } from '../../lib/cx';
import styles from './ClaimLabel.module.css';

const CLAIM_TEXT: Record<ClaimStatus, { glyph: string; text: string }> = {
  verified: { glyph: '✓', text: 'Vérifié' },
  unreviewed: { glyph: '·', text: 'Non relu' },
  uncertain: { glyph: '!', text: 'Incertain' },
};

export interface ClaimLabelProps {
  status: ClaimStatus;
  /** "Œuvre" or "Description": which claims the label is about. */
  scope?: string | undefined;
  className?: string | undefined;
}

/** One of the two review labels, kept separate from the publication status (MVP B, D18). */
export function ClaimLabel({ status, scope, className }: ClaimLabelProps) {
  const text = CLAIM_TEXT[status];
  return (
    <span className={cx(styles.label, styles[status], className)}>
      <span className={styles.glyph} aria-hidden="true">
        {text.glyph}
      </span>
      {text.text}
      {scope !== undefined && <span className={styles.scope}>{scope}</span>}
    </span>
  );
}

export const REVIEW_STATE_TEXT: Record<ReviewState, string> = {
  not_submitted: 'Brouillon',
  pending: 'En relecture',
  changes_requested: 'Corrections demandées',
  rejected: 'Refusée',
  approved: 'Acceptée',
};

export const PUBLICATION_TEXT: Record<PublicationStatus, string> = {
  draft: 'Non publiée',
  published: 'Publiée',
  unpublished: 'Retirée',
};

export interface StateLabelProps {
  review: ReviewState;
  publication: PublicationStatus;
  className?: string | undefined;
}

/** The editorial state of a submission, as one readable label. */
export function StateLabel({
  review,
  publication,
  className,
}: StateLabelProps) {
  const text =
    publication === 'published'
      ? 'Publiée dans le musée'
      : publication === 'unpublished'
        ? 'Retirée du musée'
        : REVIEW_STATE_TEXT[review];
  const tone =
    publication === 'published'
      ? styles.statePublished
      : review === 'rejected' || publication === 'unpublished'
        ? styles.stateRejected
        : review === 'changes_requested' || review === 'pending'
          ? styles.stateWarning
          : undefined;
  return (
    <span className={cx(styles.label, styles.state, tone, className)}>
      {text}
    </span>
  );
}
