/*
 * Frontend view of the KANTO contracts. The names marked "frozen" come from
 * the Gate 0 contract (docs/agents/parallel-workflow.md) and the Auth
 * contract (docs/specs/auth-contract.md). The others are [PROPOSED] by the
 * frontend and listed in docs/API-INTEGRATION.md.
 */

/** Frozen. */
export type PublicationStatus = 'draft' | 'published' | 'unpublished';
/** Frozen. Tracked separately for the item and for its description. */
export type ClaimStatus = 'unreviewed' | 'verified' | 'uncertain';
/** [PROPOSED] Editorial workflow of a submission, distinct from publication. */
export type ReviewState =
  'not_submitted' | 'pending' | 'changes_requested' | 'rejected' | 'approved';
export type Medium = 'painting' | 'sculpture' | 'craft' | 'music';
export type MediaKind = 'image' | 'video' | 'audio' | 'model';
export type MediaStatus = 'uploading' | 'ready' | 'failed' | 'detached';
export type Relationship = 'author' | 'holder' | 'representative';
/** Frozen. */
export type Model3dStatus = 'ready' | 'processing' | 'missing';
/** Frozen for pending, confirmed and failed; `none` means no mint was started. */
export type MintStatus = 'none' | 'pending' | 'confirmed' | 'failed';
/** [PROPOSED] */
export type VerificationRunStatus =
  'not_started' | 'running' | 'done' | 'failed';
/** [PROPOSED] */
export type SignalKind =
  'metadata' | 'ai_generated' | 'coherence' | 'provenance' | 'duplicate';
/** [PROPOSED] */
export type SignalOutcome = 'pass' | 'warn' | 'flag' | 'unavailable';
export type Permission = 'reviewer' | 'admin';

export interface ItemMedia {
  id: string;
  kind: MediaKind;
  name: string;
  url: string;
  bytes: number;
  primary: boolean;
  status: MediaStatus;
  /** Upload progress from 0 to 1 while `status` is `uploading`. */
  progress: number;
  width: number | null;
  height: number | null;
  /** False when the file lives only in this browser session (mock mode). */
  persistent: boolean;
}

/** A 3D scan prepared in the browser: the two GLB variants and the image shown while they load. */
export interface PreparedModel {
  /** Name of the file the contributor chose, shown in the media list. */
  sourceName: string;
  model1k: File;
  model2k: File;
  poster: File;
}

/** Frozen shape of `GET /api/items/:id/model3d`. */
export interface Model3dDisplay {
  contentId: string;
  status: Model3dStatus;
  variants: {
    poster: string;
    glb1k: string;
    glb2k: string | null;
  } | null;
}

export interface ItemRights {
  relationship: Relationship | null;
  /** Free-text rights holder shown on the notice. */
  holder: string;
  consentShare: boolean;
  consentDisplay: boolean;
}

export interface ItemReview {
  state: ReviewState;
  itemClaims: ClaimStatus;
  descriptionClaims: ClaimStatus;
  rationale: string | null;
  reviewerName: string | null;
  requestedChanges: string | null;
  updatedAt: string | null;
}

export interface VerificationSignal {
  id: string;
  kind: SignalKind;
  label: string;
  outcome: SignalOutcome;
  /** Indicative confidence from 0 to 1, never a proof. */
  confidence: number | null;
  detail: string;
  /** Always true: a signal informs the human review and never sets a status. */
  advisory: true;
}

export interface ItemVerification {
  status: VerificationRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  signals: VerificationSignal[];
}

export interface ProvenanceRecord {
  status: MintStatus;
  chain: string | null;
  token: string | null;
  transaction: string | null;
  /** When the mint was requested; null before any request. */
  requestedAt: string | null;
  mintedAt: string | null;
  explorerUrl: string | null;
  /** What the record establishes, shown next to it. */
  scope: string;
  /** True when no real transaction happened (mock mode). */
  simulated: boolean;
  failureMessage: string | null;
}

export type HistoryActor = 'contributor' | 'system' | 'reviewer' | 'admin';

export interface HistoryEvent {
  id: string;
  at: string;
  actor: HistoryActor;
  label: string;
  detail: string | null;
}

export interface ItemDetails {
  /** "2024", "vers 1950", a decade. */
  period: string;
  place: string;
  technique: string;
  dimensions: string;
  region: string;
  /** Short presentation, 280 characters, step 1 of the wizard. */
  summary: string;
  /** Full story, step 3. */
  story: string;
}

export interface Item {
  id: string;
  /** Deposit slip number shown to the contributor, for example KT-2026-0148. */
  depositNumber: string;
  ownerId: string;
  title: string;
  author: string;
  medium: Medium;
  details: ItemDetails;
  media: ItemMedia[];
  model3d: Model3dDisplay;
  rights: ItemRights;
  publication: PublicationStatus;
  review: ItemReview;
  verification: ItemVerification;
  provenance: ProvenanceRecord;
  /** Demo items illustrate the journey and are not part of the collection. */
  isDemo: boolean;
  /** Where the published work hangs, when it is in the museum. */
  room: { slug: string; number: string } | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEvent[];
}

export interface ItemDraftInput {
  title: string;
  author: string;
  medium: Medium;
  details: Partial<ItemDetails>;
  rights: Partial<ItemRights>;
}

export interface ItemListParams {
  /** [PROPOSED] S4 of ADR 0002: the caller's own items. */
  owner?: 'me';
  /** [PROPOSED] S4: `pending_review` for the review queue. */
  status?: 'pending_review' | 'published' | 'all';
  medium?: Medium;
  query?: string;
}

export interface ReviewInput {
  decision: 'approve' | 'request_changes' | 'reject';
  itemClaims: ClaimStatus;
  descriptionClaims: ClaimStatus;
  rationale: string;
  requestedChanges: string;
}

export interface Account {
  accountId: string;
  email: string;
  displayName: string;
  permissions: Permission[];
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegistrationInput extends Credentials {
  displayName: string;
}

export type ScanStage =
  | 'created'
  | 'phone_connected'
  | 'scanning'
  | 'uploading'
  | 'received'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'expired';

export interface ScanDevice {
  name: string;
  platform: string;
  connectedAt: string;
}

export interface ScanFile {
  name: string;
  bytes: number;
  kind: 'usdz' | 'glb' | 'gltf' | 'other';
}

/** [PROPOSED] Desktop to phone capture session. */
export interface ScanSession {
  id: string;
  /** Short code the visitor can type instead of scanning the QR. */
  code: string;
  itemId: string | null;
  ownerId: string | null;
  stage: ScanStage;
  /** Capture or transfer progress from 0 to 1. */
  progress: number;
  device: ScanDevice | null;
  file: ScanFile | null;
  model3d: Model3dDisplay | null;
  /** Path the phone opens, relative to the site origin. */
  pairingPath: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  error: string | null;
}

/** Frozen public error body. */
export interface PublicError {
  code: string;
  message: string;
  requestId: string;
  details?: { field: string; reason: string }[];
}

export interface UploadProgress {
  loaded: number;
  total: number;
}
