import type {
  Account,
  Credentials,
  Item,
  ItemDraftInput,
  ItemListParams,
  ItemVerification,
  MediaKind,
  Model3dDisplay,
  PreparedModel,
  ProvenanceRecord,
  PublicationStatus,
  RegistrationInput,
  ReviewInput,
  ScanDevice,
  ScanSession,
  ScanStage,
  UploadProgress,
} from './types';

export type ApiMode = 'mock' | 'gateway';

export interface UploadOptions {
  kind?: MediaKind | undefined;
  onProgress?: ((progress: UploadProgress) => void) | undefined;
}

/**
 * Everything the screens may ask the backend. One implementation talks to the
 * gateway, the other runs in the browser on persisted fixtures. Methods tagged
 * [PROPOSED] have no frozen route yet; see docs/API-INTEGRATION.md.
 */
export interface ApiClient {
  readonly mode: ApiMode;

  auth: {
    register(input: RegistrationInput): Promise<void>;
    login(input: Credentials): Promise<Account>;
    logout(): Promise<void>;
    /** `null` for a guest or an expired session. */
    me(): Promise<Account | null>;
  };

  items: {
    list(params?: ItemListParams): Promise<Item[]>;
    get(id: string): Promise<Item>;
    create(input: ItemDraftInput): Promise<Item>;
    /** [PROPOSED] Edit a draft or a submission sent back for changes. */
    update(id: string, patch: Partial<ItemDraftInput>): Promise<Item>;
    uploadMedia(id: string, file: File, options?: UploadOptions): Promise<Item>;
    /**
     * [PROPOSED] Attaches a scan prepared in the browser (GLB 1K, GLB 2K, poster)
     * as the 3D model of the item. It takes the place of a model attached
     * earlier, in one write once the three files are received. Aborting
     * `signal` gives the request up: it rejects with an `AbortError` and
     * attaches nothing when the abort comes before the files are stored.
     */
    attachModel(
      id: string,
      model: PreparedModel,
      onProgress?: (progress: UploadProgress) => void,
      signal?: AbortSignal,
    ): Promise<Item>;
    /** [PROPOSED] */
    removeMedia(id: string, mediaId: string): Promise<Item>;
    /** [PROPOSED] */
    setPrimaryMedia(id: string, mediaId: string): Promise<Item>;
    /** [PROPOSED] Draft → pending review. */
    submit(id: string): Promise<Item>;
    /** [PROPOSED] Pending → draft, by the owner. */
    withdraw(id: string): Promise<Item>;
    /** Frozen route; the decision field is [PROPOSED]. */
    review(id: string, input: ReviewInput): Promise<Item>;
    /** [PROPOSED] Admin publication toggle. S3 publishes automatically on approval. */
    setPublication(id: string, status: PublicationStatus): Promise<Item>;
    model3d(id: string): Promise<Model3dDisplay>;
    mint(id: string, idempotencyKey: string): Promise<ProvenanceRecord>;
    provenance(id: string): Promise<ProvenanceRecord>;
  };

  verification: {
    /** [PROPOSED] Starts the advisory analysis of an item. */
    start(id: string): Promise<ItemVerification>;
    /** [PROPOSED] */
    get(id: string): Promise<ItemVerification>;
  };

  scan: {
    /** [PROPOSED] */
    create(input: { itemId: string | null }): Promise<ScanSession>;
    get(id: string): Promise<ScanSession>;
    /** Resolves a session from the short code typed on the phone. */
    getByCode(code: string): Promise<ScanSession>;
    connect(id: string, device: ScanDevice): Promise<ScanSession>;
    setStage(
      id: string,
      stage: ScanStage,
      progress: number,
      error?: string | null,
    ): Promise<ScanSession>;
    upload(
      id: string,
      file: File,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<ScanSession>;
    /** Associates the received model with an item, as `model3d`. */
    attach(id: string, itemId: string): Promise<Item>;
  };
}
