# API integration — KANTO frontend

How the frontend talks to the backend, what is frozen, what is proposed, what is mocked, and how to switch. Source of truth for the frontend side: `apps/frontend/src/lib/api/`.

## 1. Modes

| `VITE_API_MODE`           | Client                              | Use                                                                                                                                                                                                                                                     |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unset or `mock` (default) | `lib/api/mock/mock-client.ts`       | Hackathon demo. State lives in memory and in `localStorage` (`kanto.mock.v1`), seeded from `lib/api/mock/fixtures.ts`. Two tabs of the same browser share it. Every screen that shows mocked data renders the `DemoBadge` ("Données de démonstration"). |
| `gateway`                 | `lib/api/gateway/gateway-client.ts` | Real services. Same-origin `/api/*` and `/auth/*`; in development Vite proxies `/api` to `GATEWAY_URL` (`apps/frontend/.env.example`). Session cookie `HttpOnly` per D07, `credentials: 'include'`.                                                     |

Both implement the same `ApiClient` interface (`lib/api/client.ts`), so screens never know which one runs. `isMockApi` and `apiMode` are exported for the badge and the demo helpers.

## 2. Frozen contract (Gate 0) used as is

| Route                                                                          | Client method                                           | Frontend use                                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/items`                                                               | `api.items.list()`                                      | Discovery list `/oeuvres`, museum links. Guests get published items only.                                                                                              |
| `GET /api/items/:id`                                                           | `api.items.get(id)`                                     | `/oeuvre/:id`, `/contribuer/:id`, `/verification/:id`, `/admin/:id`. A draft seen by a guest is a 404, so drafts never leak.                                           |
| `POST /api/items`                                                              | `api.items.create(input)`                               | Wizard step 1 creates the draft. Body: `title`, `author` (free text, S7), `medium`, `details`, `rights`.                                                               |
| `POST /api/items/:id/media`                                                    | `api.items.uploadMedia(id, file, { kind, onProgress })` | Wizard step 2, multipart `file` (+ `kind`). Progress through `XMLHttpRequest`.                                                                                         |
| `POST /api/items/:id/review`                                                   | `api.items.review(id, input)`                           | Admin review. Body carries the two claim outcomes and the rationale (frozen) plus a `decision` field (proposed, see §3). Approval publishes the item (S3 of ADR 0002). |
| `POST /api/items/:id/mint`                                                     | `api.items.mint(id, key)`                               | Provenance panel. `Idempotency-Key` header, owner only (S1), published items only.                                                                                     |
| `GET /api/items/:id/provenance`                                                | `api.items.provenance(id)`                              | Polled every second while `pending` (D16).                                                                                                                             |
| `GET /api/items/:id/model3d`                                                   | `api.items.model3d(id)`                                 | `{ contentId, status: ready                                                                                                                                            | processing | missing, variants: { poster, glb1k, glb2k } }`. The LiDAR service answers `{ status: ready | none, variants: { '1k', '2k' }, poster }`; the gateway adapts it (noted in the develop handoff). |
| `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | `api.auth.*`, `lib/session/session.ts`                  | Account pages and the header state. `GET /auth/me` returning 401 or 503 means guest.                                                                                   |

Public errors keep the frozen shape `{ code, message, requestId }`; the client raises `ApiError` with `status`, `code`, `requestId` and `details` (`VALIDATION_FAILED`). Screens show `message` and the request ID, never internals.

Types mirrored in `lib/api/types.ts`: `PublicationStatus`, `ClaimStatus` (separate for item and description), `Model3dDisplay`, `MintStatus`, `PublicError`.

## 3. Proposed additions (`[PROPOSED]`, not in the frozen contract)

Each needs a `[CONTRACT CHANGE]` pull request before a service implements it. The mock implements all of them so the demo runs end to end.

| Need                                | Proposed route                                                                          | Notes                                                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Own items and the review queue (S4) | `GET /api/items?owner=me`, `GET /api/items?status=pending_review\|published\|all`       | Content enforces from `x-caller-account-id` and the `reviewer` permission.                                                                |
| Edit a draft                        | `PATCH /api/items/:id`                                                                  | Partial `title`, `author`, `medium`, `details`, `rights`. A material change resets the advisory analysis and asks for a new review (D18). |
| Manage media                        | `DELETE /api/items/:id/media/:mediaId`, `POST /api/items/:id/media/:mediaId/primary`    |                                                                                                                                           |
| Editorial workflow                  | `POST /api/items/:id/submit`, `POST /api/items/:id/withdraw`                            | `review.state`: `not_submitted → pending → approved \| changes_requested \| rejected`. Distinct from `publication`.                       |
| Review decision                     | `decision: approve \| request_changes \| reject`, `requestedChanges` in the review body | Keeps the frozen route.                                                                                                                   |
| Publication toggle                  | `POST /api/items/:id/publication { status }`                                            | Admin only; `published` requires an approved review.                                                                                      |
| Advisory analysis                   | `POST /api/items/:id/verification` (start), `GET /api/items/:id/verification`           | `{ status: not_started                                                                                                                    | running | done | failed, startedAt, completedAt, signals: [{ kind, label, outcome: pass | warn | flag | unavailable, confidence, detail, advisory: true }] }`. Kinds: `metadata`, `ai_generated`, `coherence`, `provenance`, `duplicate`. Signals never change a claim status (MVP B). CONTENT-05a/05b are the services behind `ai_generated`and`coherence`. |
| Item history                        | `history: [{ at, actor, label, detail }]` on `GET /api/items/:id`                       | Shown on the verification page and in my space.                                                                                           |
| Deposit slip number                 | `depositNumber` on the item                                                             | `KT-2026-0148` in the Figma B5 frame.                                                                                                     |
| Scan session (desktop ↔ phone)      | see §4                                                                                  |                                                                                                                                           |

## 4. Scan session contract (proposal)

The LiDAR capture happens in the native iPhone app (Reality Composer or the team app). The web only starts a session, pairs the phone, follows progress and receives the exported file. Nothing in the browser pretends to capture.

| Route                                  | Body / response                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/scan-sessions`              | `{ itemId: string \| null }` → `ScanSession`                                                                                                                                       |
| `GET /api/scan-sessions/:id`           | `ScanSession`, polled by the desktop (1 s) and the phone (1.5 s)                                                                                                                   |
| `GET /api/scan-sessions/by-code/:code` | For a phone that types the 6-character code                                                                                                                                        |
| `POST /api/scan-sessions/:id/connect`  | `{ name, platform, connectedAt }` → stage `phone_connected`                                                                                                                        |
| `POST /api/scan-sessions/:id/stage`    | `{ stage, progress, error }` reported by the phone app (`scanning`, `uploading`, `failed`)                                                                                         |
| `PUT /api/scan-sessions/:id/file`      | multipart `file` (USDZ, GLB or glTF) → stage `received` then `processing`; GLB/glTF becomes `ready` with `model3d.variants.glb1k`; USDZ waits for the offline preparation (3D-04a) |
| `POST /api/scan-sessions/:id/attach`   | `{ itemId }` → the item's `model3d`                                                                                                                                                |

`ScanSession`: `{ id, code, itemId, ownerId, stage: created|phone_connected|scanning|uploading|received|processing|ready|failed|expired, progress, device, file: { name, bytes, kind }, model3d, pairingPath, createdAt, updatedAt, expiresAt (30 min), error }`.

In mock mode the session is shared between tabs of the same browser through `localStorage`; a real phone needs the routes above (owner: LiDAR service, shidoAdr, with the mobile team).

## 5. Compatibility with the Artiko API

The new team's backend (`artiko-api/openapi.yml`) is not the gateway of this repository, but an adapter keeps the option open. Mapping of its resources to the frontend types:

| Artiko                                                                                                     | KANTO                                                                                                                                                                                                   | Gap                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Work { id, title, story, category, media_url, media_kind, proof_urls, human_proven, ai_declared, votes }` | `Item` with `details.story`, `medium` from `category` (`painting`, `sculpture`, `crafts → craft`, `music`; `photography`, `dance`, `oral_arts`, `digital` have no room), primary media from `media_url` | No claim statuses, no publication workflow, no provenance record, no deposit number. `human_proven` could feed the `provenance` signal, `ai_declared` the `ai_generated` signal. |
| `POST /works` multipart (`file`, `proof[]`, `proof_claims`)                                                | `create` + `uploadMedia`                                                                                                                                                                                | Artiko publishes immediately; KANTO reviews first.                                                                                                                               |
| `POST /scan/image` → `human_proven                                                                         | artiko_work                                                                                                                                                                                             | known_work                                                                                                                                                                       | ai_made | unknown` | `ai_generated` and `duplicate` signals of the verification page | Advisory only, as required. |
| `GET /artists/{id}/museum` (slots with positions)                                                          | Could feed the WebGL room layout                                                                                                                                                                        | Not used; KANTO rooms come from `data/rooms.ts`.                                                                                                                                 |
| Better Auth JWT                                                                                            | `session` store                                                                                                                                                                                         | Different session model from D07 (cookie).                                                                                                                                       |
| Android app (`artiko-mobile`): photo scan, record, upload                                                  | —                                                                                                                                                                                                       | No LiDAR, no QR, no session: the scan contract of §4 is new for both teams.                                                                                                      |

An `artiko` client would implement `ApiClient` with these mappings and `VITE_API_MODE=artiko`; it is not written.

## 6. Switching to the gateway

1. Set `VITE_API_MODE=gateway` in `apps/frontend/.env` and `GATEWAY_URL` for the dev proxy.
2. The gateway must set the session cookie on `/auth/login`, strip client `x-caller-*` headers, and serve `/api/lidar/files/*` for the 3D variants.
3. Screens that rely on proposed routes (§3, §4) show the public error until the route exists; everything on the frozen contract works unchanged.
4. Remove or keep the demo accounts: they exist only in the mock.

## 7. Media

- Images uploaded in mock mode are downscaled to 1 200 px data URLs so a submission survives a reload (`lib/api/mock/images.ts`). Models, audio and video stay object URLs for the session and are marked `persistent: false`.
- Published demo media come from the gitignored `public/media/` (paintings, Poly Haven models) through `lib/media/media.ts`.
