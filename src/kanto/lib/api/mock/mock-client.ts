import type { ApiClient, UploadOptions } from '../client';
import { ApiError } from '../errors';
import { hashString, newId, nowIso } from '../ids';
import type {
  Account,
  ClaimStatus,
  HistoryActor,
  Item,
  ItemMedia,
  ItemVerification,
  MediaKind,
  Medium,
  Model3dDisplay,
  ProvenanceRecord,
  PublicationStatus,
  ReviewInput,
  ScanDevice,
  ScanSession,
  ScanStage,
  UploadProgress,
  VerificationSignal,
} from '../types';
import { seedMockState } from './fixtures';
import { storeImage } from './images';
import type { MockAccount, MockState } from './storage';
import { clearMockState, loadMockState, saveMockState } from './storage';

/** The art forms a submission may name. */
const MEDIUMS: readonly Medium[] = ['painting', 'sculpture', 'craft', 'music'];

/*
 * In-browser implementation of the API for the hackathon demo. State lives in
 * memory and in localStorage, so a submission survives a reload and two tabs
 * of the same browser see the same scan session. Every screen that runs on it
 * shows the "Données de démonstration" mark. Nothing here is a real service.
 */

export interface MockClientOptions {
  /** Persist to localStorage. Tests pass false. */
  persist?: boolean | undefined;
  latencyMs?: number | undefined;
}

export interface MockApiClient extends ApiClient {
  /**
   * Forgets everything and reseeds the demo content. `keepSession` leaves the
   * current demo account signed in, for the reset button of the interface.
   */
  reset(options?: { keepSession?: boolean }): void;
}

const VERIFICATION_MS = 2200;
const MINT_MS = 3500;
const PROCESSING_MS = 2500;
const SCAN_TTL_MS = 30 * 60 * 1000;
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requestId(): string {
  return `mock-${newId().slice(0, 8)}`;
}

function fail(
  status: number,
  code: string,
  message: string,
  details?: { field: string; reason: string }[],
): never {
  throw new ApiError(
    status,
    details === undefined
      ? { code, message, requestId: requestId() }
      : { code, message, requestId: requestId(), details },
    message,
  );
}

function toAccount(account: MockAccount): Account {
  return {
    accountId: account.accountId,
    email: account.email,
    displayName: account.displayName,
    permissions: [...account.permissions],
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isReviewer(account: MockAccount | null): boolean {
  return (
    account !== null &&
    (account.permissions.includes('reviewer') ||
      account.permissions.includes('admin'))
  );
}

function isAdmin(account: MockAccount | null): boolean {
  return account !== null && account.permissions.includes('admin');
}

function mediaKindOf(file: File, requested: MediaKind | undefined): MediaKind {
  if (requested !== undefined) {
    return requested;
  }
  const name = file.name.toLowerCase();
  if (/\.(glb|gltf|usdz)$/.test(name)) {
    return 'model';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  if (file.type.startsWith('audio/')) {
    return 'audio';
  }
  return 'image';
}

function scanFileKind(name: string): 'usdz' | 'glb' | 'gltf' | 'other' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.usdz')) {
    return 'usdz';
  }
  if (lower.endsWith('.glb')) {
    return 'glb';
  }
  if (lower.endsWith('.gltf')) {
    return 'gltf';
  }
  return 'other';
}

function elapsed(since: string | null): number {
  return since === null ? 0 : Date.now() - new Date(since).getTime();
}

function pairingCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)] ?? 'A';
  }
  return code;
}

function signal(
  kind: VerificationSignal['kind'],
  label: string,
  outcome: VerificationSignal['outcome'],
  confidence: number | null,
  detail: string,
): VerificationSignal {
  return {
    id: `${kind}-${newId().slice(0, 6)}`,
    kind,
    label,
    outcome,
    confidence,
    detail,
    advisory: true,
  };
}

/** Deterministic advisory signals, computed from the record itself. */
function computeSignals(
  item: Item,
  others: readonly Item[],
): VerificationSignal[] {
  const seed = hashString(`${item.id}:${item.title}`);
  const missing = (
    [
      ['période', item.details.period],
      ['lieu', item.details.place],
      ['technique', item.details.technique],
      ['dimensions', item.details.dimensions],
    ] as const
  )
    .filter(([, value]) => value.trim() === '')
    .map(([label]) => label);
  const images = item.media.filter(
    (media) => media.kind === 'image' && media.status === 'ready',
  );
  const names = `${item.title} ${item.media.map((media) => media.name).join(' ')}`;
  const looksGenerated =
    /generat|midjourney|dall|stable-diffusion|\bia\b|-ai\b|\bai-/i.test(names);
  const aiConfidence = looksGenerated ? 0.81 : (seed % 23) / 100;
  const summaryShort = item.details.summary.trim().length < 40;
  const storyEmpty = item.details.story.trim() === '';
  const duplicate = others.some(
    (other) =>
      other.id !== item.id &&
      other.title.trim().toLowerCase() === item.title.trim().toLowerCase(),
  );

  return [
    signal(
      'metadata',
      'Analyse des métadonnées',
      missing.length === 0 ? 'pass' : missing.length <= 2 ? 'warn' : 'flag',
      null,
      missing.length === 0
        ? 'Titre, auteur, période, lieu, technique et dimensions sont renseignés.'
        : `Champs manquants : ${missing.join(', ')}. La notice restera incomplète.`,
    ),
    signal(
      'ai_generated',
      'Détection de contenu généré par IA',
      images.length === 0
        ? 'unavailable'
        : aiConfidence >= 0.6
          ? 'flag'
          : aiConfidence >= 0.35
            ? 'warn'
            : 'pass',
      images.length === 0 ? null : aiConfidence,
      images.length === 0
        ? 'Aucune image prête à analyser.'
        : `Indice de génération de ${String(Math.round(aiConfidence * 100))} % sur ${String(images.length)} image${images.length > 1 ? 's' : ''}. Service de démonstration : ce score oriente la relecture humaine et ne prouve rien.`,
    ),
    signal(
      'coherence',
      'Cohérence description / médias',
      summaryShort || storyEmpty ? 'warn' : 'pass',
      null,
      summaryShort
        ? 'La présentation est très courte : la relecture ne pourra pas la confronter aux images.'
        : storyEmpty
          ? 'Le récit complet est vide. La présentation courte sera la seule description publiée.'
          : 'La description nomme des éléments visibles sur les médias (vérification indicative).',
    ),
    signal(
      'provenance',
      'Contrôle de provenance et de droits',
      item.rights.relationship === null ||
        !item.rights.consentShare ||
        !item.rights.consentDisplay
        ? 'flag'
        : item.rights.holder.trim() === ''
          ? 'warn'
          : 'pass',
      null,
      item.rights.relationship === null
        ? 'Le lien avec l’œuvre n’est pas déclaré.'
        : !item.rights.consentShare || !item.rights.consentDisplay
          ? 'Les consentements de partage et de présentation ne sont pas tous donnés : publication impossible (D18).'
          : item.rights.holder.trim() === ''
            ? 'Le détenteur des droits n’est pas nommé.'
            : 'Lien déclaré et consentements donnés. La preuve de provenance reste à apprécier par la relecture.',
    ),
    signal(
      'duplicate',
      'Recherche de doublon',
      duplicate ? 'warn' : 'pass',
      null,
      duplicate
        ? 'Une autre fiche porte le même titre.'
        : 'Aucune fiche de la collection ne porte ce titre (comparaison de démonstration).',
    ),
  ];
}

export function createMockClient(
  options: MockClientOptions = {},
): MockApiClient {
  const persist = options.persist ?? true;
  const latency = options.latencyMs ?? 280;
  let state: MockState = (persist ? loadMockState() : null) ?? seedMockState();

  function delay(ms = latency): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /** Picks up writes made by another tab of the same browser. */
  function sync(): void {
    if (!persist) {
      return;
    }
    const stored = loadMockState();
    if (stored !== null && stored.revision > state.revision) {
      state = stored;
    }
  }

  function commit(): void {
    state.revision += 1;
    if (persist) {
      saveMockState(state);
    }
  }

  function currentAccount(): MockAccount | null {
    return (
      state.accounts.find(
        (account) => account.accountId === state.sessionAccountId,
      ) ?? null
    );
  }

  function requireAccount(): MockAccount {
    const account = currentAccount();
    if (account === null) {
      fail(401, 'SESSION_INVALID', 'Connectez-vous pour continuer.');
    }
    return account;
  }

  function requireReviewer(): MockAccount {
    const account = requireAccount();
    if (!isReviewer(account)) {
      fail(
        403,
        'FORBIDDEN',
        'Cette action demande la permission de relecture.',
      );
    }
    return account;
  }

  function canSee(item: Item, account: MockAccount | null): boolean {
    return (
      item.publication === 'published' ||
      (account !== null &&
        (item.ownerId === account.accountId || isReviewer(account)))
    );
  }

  function findItem(id: string): Item {
    const item = state.items.find((candidate) => candidate.id === id);
    if (item === undefined || !canSee(item, currentAccount())) {
      fail(404, 'NOT_FOUND', 'Cette œuvre est introuvable.');
    }
    return item;
  }

  function requireOwnItem(id: string): { item: Item; account: MockAccount } {
    const account = requireAccount();
    const item = findItem(id);
    if (item.ownerId !== account.accountId && !isAdmin(account)) {
      fail(403, 'FORBIDDEN', 'Vous ne pouvez modifier que vos propres œuvres.');
    }
    return { item, account };
  }

  function record(
    item: Item,
    actor: HistoryActor,
    label: string,
    detail: string | null = null,
  ): void {
    const at = nowIso();
    item.history.push({ id: newId(), at, actor, label, detail });
    item.updatedAt = at;
  }

  function settleVerification(item: Item): void {
    if (
      item.verification.status === 'running' &&
      elapsed(item.verification.startedAt) >= VERIFICATION_MS
    ) {
      item.verification = {
        status: 'done',
        startedAt: item.verification.startedAt,
        completedAt: nowIso(),
        signals: computeSignals(item, state.items),
      };
      const flagged = item.verification.signals.filter(
        (candidate) => candidate.outcome === 'flag',
      ).length;
      record(
        item,
        'system',
        flagged === 0
          ? 'Analyse assistée terminée sans signal bloquant'
          : `Analyse assistée terminée : ${String(flagged)} signal${flagged > 1 ? 'aux' : ''} à examiner`,
        'Signaux indicatifs transmis à la relecture humaine.',
      );
      commit();
    }
  }

  function settleMint(item: Item): void {
    if (
      item.provenance.status === 'pending' &&
      elapsed(item.provenance.requestedAt) >= MINT_MS
    ) {
      const seed = hashString(item.id).toString(16).padStart(8, '0');
      item.provenance = {
        ...item.provenance,
        status: 'confirmed',
        chain: 'Réseau de test (simulation)',
        token: `#${String(1000 + (hashString(item.id) % 9000))}`,
        transaction:
          `0x${seed}${seed}${seed}${seed}${seed}${seed}${seed}${seed}`.slice(
            0,
            66,
          ),
        mintedAt: nowIso(),
        explorerUrl: null,
        simulated: true,
      };
      record(
        item,
        'system',
        'Certificat de provenance simulé confirmé',
        'Aucune transaction réelle : mode démonstration.',
      );
      commit();
    }
  }

  function settleScan(scan: ScanSession): void {
    if (
      scan.stage !== 'expired' &&
      scan.stage !== 'ready' &&
      scan.stage !== 'failed' &&
      new Date(scan.expiresAt).getTime() < Date.now()
    ) {
      scan.stage = 'expired';
      scan.updatedAt = nowIso();
      commit();
      return;
    }
    if (
      scan.stage === 'processing' &&
      scan.file !== null &&
      (scan.file.kind === 'glb' || scan.file.kind === 'gltf') &&
      elapsed(scan.updatedAt) >= PROCESSING_MS
    ) {
      scan.stage = 'ready';
      scan.progress = 1;
      scan.updatedAt = nowIso();
      commit();
    }
  }

  function findScan(id: string): ScanSession {
    const scan = state.scans.find((candidate) => candidate.id === id);
    if (scan === undefined) {
      fail(404, 'NOT_FOUND', 'Cette session de scan est introuvable.');
    }
    settleScan(scan);
    return scan;
  }

  function view(item: Item): Item {
    settleVerification(item);
    settleMint(item);
    return clone(item);
  }

  function nextDepositNumber(): string {
    state.counter += 1;
    return `KT-2026-${String(state.counter).padStart(4, '0')}`;
  }

  async function simulateUpload(
    total: number,
    onProgress: ((progress: UploadProgress) => void) | undefined,
  ): Promise<void> {
    const steps = 5;
    for (let step = 1; step <= steps; step += 1) {
      await delay(Math.max(60, latency / 2));
      onProgress?.({ loaded: Math.round((total * step) / steps), total });
    }
  }

  const client: MockApiClient = {
    mode: 'mock',

    reset(options = {}): void {
      const previousAccount =
        options.keepSession === true ? state.sessionAccountId : null;
      clearMockState();
      state = seedMockState();
      if (
        previousAccount !== null &&
        state.accounts.some((account) => account.accountId === previousAccount)
      ) {
        state.sessionAccountId = previousAccount;
      }
      if (persist) {
        saveMockState(state);
      }
    },

    auth: {
      async register(input) {
        await delay();
        sync();
        const details: { field: string; reason: string }[] = [];
        const email = normalizeEmail(input.email);
        if (!EMAIL.test(email)) {
          details.push({ field: 'email', reason: 'Adresse e-mail invalide.' });
        }
        const length = Array.from(input.password.normalize('NFKC')).length;
        if (length < PASSWORD_MIN || length > PASSWORD_MAX) {
          details.push({
            field: 'password',
            reason: `Le mot de passe compte entre ${String(PASSWORD_MIN)} et ${String(PASSWORD_MAX)} caractères.`,
          });
        }
        if (input.displayName.trim() === '') {
          details.push({ field: 'displayName', reason: 'Indiquez un nom.' });
        }
        if (details.length > 0) {
          fail(
            400,
            'VALIDATION_FAILED',
            'Certains champs sont à corriger.',
            details,
          );
        }
        if (state.accounts.some((account) => account.email === email)) {
          fail(
            409,
            'EMAIL_ALREADY_REGISTERED',
            'Un compte existe déjà avec cette adresse.',
          );
        }
        state.accounts.push({
          accountId: newId(),
          email,
          displayName: input.displayName.trim(),
          permissions: [],
          password: input.password,
        });
        commit();
      },

      async login(input) {
        await delay();
        sync();
        const email = normalizeEmail(input.email);
        const account = state.accounts.find(
          (candidate) =>
            candidate.email === email && candidate.password === input.password,
        );
        if (account === undefined) {
          fail(
            401,
            'INVALID_CREDENTIALS',
            'Adresse ou mot de passe incorrect.',
          );
        }
        state.sessionAccountId = account.accountId;
        commit();
        return toAccount(account);
      },

      async logout() {
        await delay(80);
        sync();
        state.sessionAccountId = null;
        commit();
      },

      async me() {
        await delay(60);
        sync();
        const account = currentAccount();
        return account === null ? null : toAccount(account);
      },
    },

    items: {
      async list(params = {}) {
        await delay();
        sync();
        const account = currentAccount();
        let items = state.items;
        if (params.owner === 'me') {
          const owner = requireAccount();
          items = items.filter((item) => item.ownerId === owner.accountId);
        } else if (params.status === 'pending_review') {
          requireReviewer();
          items = items.filter(
            (item) =>
              item.review.state === 'pending' ||
              item.review.state === 'changes_requested',
          );
        } else if (params.status === 'all') {
          requireReviewer();
        } else {
          items = items.filter((item) => item.publication === 'published');
        }
        if (params.medium !== undefined) {
          const medium = params.medium;
          items = items.filter((item) => item.medium === medium);
        }
        if (params.query !== undefined && params.query.trim() !== '') {
          const query = params.query.trim().toLowerCase();
          items = items.filter((item) =>
            `${item.title} ${item.author} ${item.details.region} ${item.details.technique} ${item.details.summary}`
              .toLowerCase()
              .includes(query),
          );
        }
        return items.filter((item) => canSee(item, account)).map(view);
      },

      async get(id) {
        await delay();
        sync();
        return view(findItem(id));
      },

      async create(input) {
        await delay();
        sync();
        const account = requireAccount();
        const at = nowIso();
        const id = newId();
        const item: Item = {
          id,
          depositNumber: nextDepositNumber(),
          ownerId: account.accountId,
          title: input.title.trim(),
          author: input.author.trim(),
          medium: input.medium,
          details: {
            period: input.details.period ?? '',
            place: input.details.place ?? '',
            technique: input.details.technique ?? '',
            dimensions: input.details.dimensions ?? '',
            region: input.details.region ?? '',
            summary: input.details.summary ?? '',
            story: input.details.story ?? '',
          },
          media: [],
          model3d: { contentId: id, status: 'missing', variants: null },
          rights: {
            relationship: input.rights.relationship ?? null,
            holder: input.rights.holder ?? account.displayName,
            consentShare: input.rights.consentShare ?? false,
            consentDisplay: input.rights.consentDisplay ?? false,
          },
          publication: 'draft',
          review: {
            state: 'not_submitted',
            itemClaims: 'unreviewed',
            descriptionClaims: 'unreviewed',
            rationale: null,
            reviewerName: null,
            requestedChanges: null,
            updatedAt: null,
          },
          verification: {
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            signals: [],
          },
          provenance: {
            status: 'none',
            chain: null,
            token: null,
            transaction: null,
            requestedAt: null,
            mintedAt: null,
            explorerUrl: null,
            scope:
              'Le certificat atteste un événement numérique lié à cette fiche : son dépôt, sa relecture et sa publication. Il n’établit ni l’authenticité physique de l’objet ni la propriété intellectuelle.',
            simulated: true,
            failureMessage: null,
          },
          isDemo: false,
          room: null,
          createdAt: at,
          updatedAt: at,
          history: [
            {
              id: newId(),
              at,
              actor: 'contributor',
              label: 'Brouillon créé',
              detail: null,
            },
          ],
        };
        state.items.unshift(item);
        commit();
        return clone(item);
      },

      async update(id, patch) {
        await delay();
        sync();
        const { item } = requireOwnItem(id);
        if (item.review.state === 'approved' && !isAdmin(currentAccount())) {
          fail(
            409,
            'ITEM_PUBLISHED',
            'Une œuvre publiée se modifie depuis l’administration.',
          );
        }
        if (patch.title !== undefined) {
          item.title = patch.title.trim();
        }
        if (patch.author !== undefined) {
          item.author = patch.author.trim();
        }
        if (patch.medium !== undefined) {
          item.medium = patch.medium;
        }
        if (patch.details !== undefined) {
          item.details = { ...item.details, ...patch.details };
        }
        if (patch.rights !== undefined) {
          item.rights = { ...item.rights, ...patch.rights };
        }
        item.updatedAt = nowIso();
        if (item.verification.status === 'done') {
          // A material change needs a new analysis and a new review (D18).
          item.verification = {
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            signals: [],
          };
        }
        commit();
        return clone(item);
      },

      async uploadMedia(id, file, options: UploadOptions = {}) {
        sync();
        const { item } = requireOwnItem(id);
        const kind = mediaKindOf(file, options.kind);
        const media: ItemMedia = {
          id: newId(),
          kind,
          name: file.name,
          url: '',
          bytes: file.size,
          primary:
            kind === 'image' &&
            !item.media.some((candidate) => candidate.primary),
          status: 'uploading',
          progress: 0,
          width: null,
          height: null,
          persistent: false,
        };
        item.media.push(media);
        await simulateUpload(file.size, (progress) => {
          media.progress =
            progress.total === 0 ? 1 : progress.loaded / progress.total;
          options.onProgress?.(progress);
        });
        if (kind === 'image') {
          const stored = await storeImage(file);
          media.url = stored.url;
          media.width = stored.width;
          media.height = stored.height;
          media.persistent = stored.persistent;
        } else {
          media.url = URL.createObjectURL(file);
        }
        media.status = 'ready';
        media.progress = 1;
        if (kind === 'model') {
          const fileKind = scanFileKind(file.name);
          const poster = item.media.find(
            (candidate) => candidate.kind === 'image' && candidate.primary,
          );
          item.model3d =
            fileKind === 'glb' || fileKind === 'gltf'
              ? {
                  contentId: item.id,
                  status: 'ready',
                  variants: {
                    poster: poster?.url ?? '',
                    glb1k: media.url,
                    glb2k: null,
                  },
                }
              : { contentId: item.id, status: 'processing', variants: null };
        }
        record(item, 'contributor', `Média ajouté : ${file.name}`);
        commit();
        return clone(item);
      },

      async attachModel(id, model, onProgress, signal) {
        sync();
        requireOwnItem(id);
        // A request given up stops before anything is written.
        const stopIfGivenUp = (): void => {
          if (signal?.aborted === true) {
            throw new DOMException('Envoi du modèle abandonné.', 'AbortError');
          }
        };
        stopIfGivenUp();
        await simulateUpload(
          model.model1k.size + model.model2k.size + model.poster.size,
          (progress) => {
            stopIfGivenUp();
            onProgress?.(progress);
          },
        );
        stopIfGivenUp();
        // The item may have changed while the files were sent: it is read again.
        sync();
        const { item } = requireOwnItem(id);
        const glb1k = URL.createObjectURL(model.model1k);
        // One model per item. The new scan takes the place of the previous one
        // in a single write, so the media list and `model3d` never disagree.
        item.media = item.media.filter(
          (candidate) => candidate.kind !== 'model',
        );
        item.media.push({
          id: newId(),
          kind: 'model',
          name: model.sourceName,
          url: glb1k,
          bytes: model.model1k.size,
          primary: false,
          status: 'ready',
          progress: 1,
          width: null,
          height: null,
          persistent: false,
        });
        item.model3d = {
          contentId: item.id,
          status: 'ready',
          variants: {
            poster: URL.createObjectURL(model.poster),
            glb1k,
            glb2k: URL.createObjectURL(model.model2k),
          },
        };
        record(item, 'contributor', `Modèle 3D ajouté : ${model.sourceName}`);
        commit();
        return clone(item);
      },

      async removeMedia(id, mediaId) {
        await delay(120);
        sync();
        const { item } = requireOwnItem(id);
        const removed = item.media.find((media) => media.id === mediaId);
        item.media = item.media.filter((media) => media.id !== mediaId);
        if (removed?.kind === 'model') {
          item.model3d = {
            contentId: item.id,
            status: 'missing',
            variants: null,
          };
        }
        if (!item.media.some((media) => media.primary)) {
          const firstImage = item.media.find((media) => media.kind === 'image');
          if (firstImage !== undefined) {
            firstImage.primary = true;
          }
        }
        item.updatedAt = nowIso();
        commit();
        return clone(item);
      },

      async setPrimaryMedia(id, mediaId) {
        await delay(120);
        sync();
        const { item } = requireOwnItem(id);
        for (const media of item.media) {
          media.primary = media.id === mediaId;
        }
        if (item.model3d.variants !== null) {
          const primary = item.media.find((media) => media.primary);
          item.model3d.variants.poster =
            primary?.url ?? item.model3d.variants.poster;
        }
        item.updatedAt = nowIso();
        commit();
        return clone(item);
      },

      async submit(id) {
        await delay();
        sync();
        const { item, account } = requireOwnItem(id);
        // The short form asks only the title, the art form, one photograph or
        // a ready 3D model, and the one consent. The rest has defaults.
        const details: { field: string; reason: string }[] = [];
        if (item.title.trim() === '') {
          details.push({
            field: 'title',
            reason: 'Donnez un titre à votre œuvre, même provisoire.',
          });
        }
        if (!MEDIUMS.includes(item.medium)) {
          details.push({
            field: 'medium',
            reason: 'Choisissez une forme d’art.',
          });
        }
        // A scanned 3D model shows the work by itself: no photograph is needed then.
        if (
          item.model3d.status !== 'ready' &&
          !item.media.some(
            (media) => media.kind === 'image' && media.status === 'ready',
          )
        ) {
          details.push({
            field: 'media',
            reason: 'Ajoutez une photographie ou un modèle 3D.',
          });
        }
        if (!item.rights.consentShare || !item.rights.consentDisplay) {
          details.push({
            field: 'consent',
            reason: 'Cochez la case pour envoyer votre œuvre.',
          });
        }
        if (details.length > 0) {
          fail(400, 'VALIDATION_FAILED', 'La fiche est incomplète.', details);
        }
        if (item.author.trim() === '') {
          item.author = account.displayName;
        }
        if (item.rights.relationship === null) {
          item.rights = { ...item.rights, relationship: 'author' };
        }
        if (item.rights.holder.trim() === '') {
          item.rights = { ...item.rights, holder: item.author };
        }
        item.review = {
          ...item.review,
          state: 'pending',
          requestedChanges: null,
          updatedAt: nowIso(),
        };
        item.publication = 'draft';
        record(
          item,
          'contributor',
          'Envoyée en relecture',
          `Bordereau ${item.depositNumber}`,
        );
        commit();
        return clone(item);
      },

      async withdraw(id) {
        await delay();
        sync();
        const { item } = requireOwnItem(id);
        if (item.review.state !== 'pending') {
          fail(
            409,
            'NOT_PENDING',
            'Seule une œuvre en relecture peut être retirée.',
          );
        }
        item.review = {
          ...item.review,
          state: 'not_submitted',
          updatedAt: nowIso(),
        };
        record(item, 'contributor', 'Retirée de la relecture');
        commit();
        return clone(item);
      },

      async review(id, input: ReviewInput) {
        await delay();
        sync();
        const reviewer = requireReviewer();
        const item = findItem(id);
        if (item.ownerId === reviewer.accountId) {
          fail(
            403,
            'OWN_SUBMISSION',
            'Vous ne pouvez pas relire votre propre dépôt.',
          );
        }
        if (input.rationale.trim() === '') {
          fail(
            400,
            'VALIDATION_FAILED',
            'Expliquez la décision en une phrase.',
            [
              {
                field: 'rationale',
                reason: 'La justification est obligatoire.',
              },
            ],
          );
        }
        const at = nowIso();
        const claims: {
          itemClaims: ClaimStatus;
          descriptionClaims: ClaimStatus;
        } = {
          itemClaims: input.itemClaims,
          descriptionClaims: input.descriptionClaims,
        };
        if (input.decision === 'approve') {
          const consent =
            item.rights.consentShare && item.rights.consentDisplay;
          if (!consent) {
            fail(
              409,
              'RIGHTS_NOT_CLEARED',
              'Publication impossible sans les consentements (D18).',
            );
          }
          item.review = {
            ...claims,
            state: 'approved',
            rationale: input.rationale,
            reviewerName: reviewer.displayName,
            requestedChanges: null,
            updatedAt: at,
          };
          item.publication = 'published';
          record(item, 'reviewer', 'Relecture : acceptée', input.rationale);
          record(
            item,
            'system',
            'Publiée dans le musée',
            'Publication automatique après relecture (S3).',
          );
        } else if (input.decision === 'request_changes') {
          item.review = {
            ...claims,
            state: 'changes_requested',
            rationale: input.rationale,
            reviewerName: reviewer.displayName,
            requestedChanges:
              input.requestedChanges.trim() === ''
                ? input.rationale
                : input.requestedChanges,
            updatedAt: at,
          };
          record(
            item,
            'reviewer',
            'Corrections demandées',
            item.review.requestedChanges,
          );
        } else {
          item.review = {
            ...claims,
            state: 'rejected',
            rationale: input.rationale,
            reviewerName: reviewer.displayName,
            requestedChanges: null,
            updatedAt: at,
          };
          record(
            item,
            'reviewer',
            'Refusée après relecture humaine',
            input.rationale,
          );
        }
        commit();
        return clone(item);
      },

      async setPublication(id, status: PublicationStatus) {
        await delay();
        sync();
        const admin = requireAccount();
        if (!isAdmin(admin)) {
          fail(
            403,
            'FORBIDDEN',
            'Cette action demande la permission d’administration.',
          );
        }
        const item = findItem(id);
        if (status === 'published' && item.review.state !== 'approved') {
          fail(
            409,
            'NOT_REVIEWED',
            'Une œuvre se publie après une relecture acceptée.',
          );
        }
        item.publication = status;
        record(
          item,
          'admin',
          status === 'published'
            ? 'Republiée'
            : status === 'unpublished'
              ? 'Retirée du musée'
              : 'Remise en brouillon',
        );
        commit();
        return clone(item);
      },

      async model3d(id): Promise<Model3dDisplay> {
        await delay(100);
        sync();
        return clone(findItem(id).model3d);
      },

      async mint(id, idempotencyKey): Promise<ProvenanceRecord> {
        await delay();
        sync();
        const account = requireAccount();
        const item = findItem(id);
        if (item.publication !== 'published') {
          fail(
            409,
            'NOT_PUBLISHED',
            'Le certificat se crée pour une œuvre publiée.',
          );
        }
        if (item.ownerId !== account.accountId && !isAdmin(account)) {
          fail(
            403,
            'FORBIDDEN',
            'Seul le déposant peut demander le certificat (S1).',
          );
        }
        if (
          item.provenance.status === 'pending' ||
          item.provenance.status === 'confirmed'
        ) {
          settleMint(item);
          return clone(item.provenance);
        }
        state.mintKeys[item.id] = idempotencyKey;
        item.provenance = {
          ...item.provenance,
          status: 'pending',
          requestedAt: nowIso(),
          failureMessage: null,
          simulated: true,
        };
        record(
          item,
          'contributor',
          'Certificat de provenance demandé',
          'Simulation : aucune transaction réelle.',
        );
        commit();
        return clone(item.provenance);
      },

      async provenance(id): Promise<ProvenanceRecord> {
        await delay(100);
        sync();
        const item = findItem(id);
        settleMint(item);
        return clone(item.provenance);
      },
    },

    verification: {
      async start(id): Promise<ItemVerification> {
        await delay();
        sync();
        const account = requireAccount();
        const item = findItem(id);
        if (item.ownerId !== account.accountId && !isReviewer(account)) {
          fail(
            403,
            'FORBIDDEN',
            'Seul le déposant ou la relecture lance l’analyse.',
          );
        }
        item.verification = {
          status: 'running',
          startedAt: nowIso(),
          completedAt: null,
          signals: [],
        };
        record(
          item,
          'system',
          'Analyse assistée lancée',
          'Métadonnées, génération par IA, cohérence, provenance, doublons.',
        );
        commit();
        return clone(item.verification);
      },

      async get(id): Promise<ItemVerification> {
        await delay(100);
        sync();
        const item = findItem(id);
        settleVerification(item);
        return clone(item.verification);
      },
    },

    scan: {
      async create(input) {
        await delay();
        sync();
        const account = currentAccount();
        const at = nowIso();
        const id = newId();
        const scan: ScanSession = {
          id,
          code: pairingCode(),
          itemId: input.itemId,
          ownerId: account?.accountId ?? null,
          stage: 'created',
          progress: 0,
          device: null,
          file: null,
          model3d: null,
          pairingPath: `/numerisation/${id}/telephone`,
          createdAt: at,
          updatedAt: at,
          expiresAt: new Date(Date.now() + SCAN_TTL_MS).toISOString(),
          error: null,
        };
        state.scans.unshift(scan);
        commit();
        return clone(scan);
      },

      async get(id) {
        await delay(100);
        sync();
        return clone(findScan(id));
      },

      async getByCode(code) {
        await delay(100);
        sync();
        const scan = state.scans.find(
          (candidate) => candidate.code === code.trim().toUpperCase(),
        );
        if (scan === undefined) {
          fail(404, 'NOT_FOUND', 'Aucune session ne porte ce code.');
        }
        settleScan(scan);
        return clone(scan);
      },

      async connect(id, device: ScanDevice) {
        await delay(120);
        sync();
        const scan = findScan(id);
        if (scan.stage === 'expired') {
          fail(
            410,
            'SESSION_EXPIRED',
            'Cette session a expiré. Relancez-la depuis l’ordinateur.',
          );
        }
        scan.device = device;
        if (scan.stage === 'created') {
          scan.stage = 'phone_connected';
        }
        scan.updatedAt = nowIso();
        commit();
        return clone(scan);
      },

      async setStage(id, stage: ScanStage, progress, error = null) {
        await delay(80);
        sync();
        const scan = findScan(id);
        scan.stage = stage;
        scan.progress = Math.min(1, Math.max(0, progress));
        scan.error = error;
        scan.updatedAt = nowIso();
        commit();
        return clone(scan);
      },

      async upload(id, file, onProgress) {
        sync();
        const scan = findScan(id);
        scan.stage = 'uploading';
        scan.progress = 0;
        scan.updatedAt = nowIso();
        commit();
        await simulateUpload(file.size, (progress) => {
          scan.progress =
            progress.total === 0 ? 1 : progress.loaded / progress.total;
          onProgress?.(progress);
        });
        const kind = scanFileKind(file.name);
        const url = URL.createObjectURL(file);
        scan.file = { name: file.name, bytes: file.size, kind };
        scan.stage = kind === 'other' ? 'failed' : 'processing';
        scan.error =
          kind === 'other'
            ? 'Format non reconnu. Envoyez un fichier USDZ, GLB ou glTF.'
            : null;
        scan.model3d =
          kind === 'glb' || kind === 'gltf'
            ? {
                contentId: scan.itemId ?? scan.id,
                status: 'ready',
                variants: { poster: '', glb1k: url, glb2k: null },
              }
            : kind === 'usdz'
              ? {
                  contentId: scan.itemId ?? scan.id,
                  status: 'processing',
                  variants: null,
                }
              : null;
        scan.progress = 1;
        scan.updatedAt = nowIso();
        commit();
        return clone(scan);
      },

      async attach(id, itemId) {
        await delay();
        sync();
        const scan = findScan(id);
        const { item } = requireOwnItem(itemId);
        if (scan.model3d === null) {
          fail(409, 'NO_MODEL', 'Aucun modèle reçu dans cette session.');
        }
        item.model3d = { ...scan.model3d, contentId: item.id };
        if (
          scan.file !== null &&
          !item.media.some((media) => media.kind === 'model')
        ) {
          item.media.push({
            id: newId(),
            kind: 'model',
            name: scan.file.name,
            url: scan.model3d.variants?.glb1k ?? '',
            bytes: scan.file.bytes,
            primary: false,
            status: 'ready',
            progress: 1,
            width: null,
            height: null,
            persistent: false,
          });
        }
        scan.itemId = item.id;
        scan.updatedAt = nowIso();
        record(
          item,
          'contributor',
          'Modèle 3D reçu depuis le téléphone',
          scan.file?.name ?? null,
        );
        commit();
        return clone(item);
      },
    },
  };

  return client;
}
