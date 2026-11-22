# Frontend roadmap — KANTO

Prioritized backlog for the hackathon, built on `feature/kanto-frontend`. P0 is needed for the end-to-end demo, P1 for a complete experience, P2 is polish or depends on work outside the frontend. "Mock" means the screen runs on the in-browser adapter (`VITE_API_MODE=mock`) with persisted fixtures and a visible "Données de démonstration" mark; "Real" means it calls the gateway contract.

## Lots

| Lot                             | Scope                                                                                                                                                                                                 | Priority         | Depends on           | Parallel with |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- | ------------- |
| L0 Rename and base              | KANTO wordmark, titles, copy, docs; ESLint ignores; docs cherry-picked                                                                                                                                | P0 · done        | —                    | —             |
| L1 Foundation                   | `lib/api/` typed client on the frozen contract + Auth routes, mock adapter with `localStorage` persistence, session store, `HallLayout`, form components, routes skeleton                             | P0 · done        | L0                   | —             |
| L2 Account                      | `/connexion`, `/inscription`, signed-in header state, sign-out, protected-route redirect with return path                                                                                             | P0 · done        | L1                   | L3, L4        |
| L3 Contribution                 | `/contribuer` hub (record / import 3D / scan), wizard steps 1–4 from Figma B1–B4, local 3D preview, B5 confirmation, drafts autosaved                                                                 | P0 · done        | L1                   | L2, L4        |
| L4 Item detail and verification | `/oeuvre/:id` public page; `/verification/:id` with metadata checks, advisory AI signals, coherence, human review outcomes, history, NFT state                                                        | P0 · done        | L1                   | L2, L3        |
| L5 My space                     | `/mon-espace` dashboard, my works with statuses, edit through the wizard, read-only profile                                                                                                           | P0 · done        | L2                   | L6, L7        |
| L6 Scan session                 | `/scan/:id` desktop with QR and link, connection state, progress, transfer, receipt, preview, resume; `/scan/:id/telephone` phone page; proposed contract                                             | P0 (UI) · done   | L1                   | L5, L7        |
| L7 Administration               | `/admin` submissions and published works, `/admin/:id` review with approve / reject / request corrections, verification statuses                                                                      | P1 · done        | L1, L2               | L5, L6        |
| L8 Museum polish from Figma     | A3 Plan du musée overlay, A4 poster, A5 error inside the frame, A1 loading with sound invitation, A6 end of visit, "Manipuler en 3D"                                                                  | P1 · done        | —                    | any           |
| L9 Discovery                    | Item list `/oeuvres` with search and medium filters, link into the room                                                                                                                               | P1 · done        | L1                   | any           |
| L10 Rooms 03 and 04             | Savoir-faire series + film slot, Musique audio label                                                                                                                                                  | P2               | rights-cleared media | —             |
| L11 Integration                 | Switch `VITE_API_MODE=gateway` against the real gateway when it exists; Artiko adapter if that backend is chosen                                                                                      | P2               | gateway / Artiko     | —             |
| L12 Validation                  | Demo path and browser checks at 390×844 and 1440×900 done, MVP-DEMO.md written. Still to do: 1024×768 and 2560×1440 passes, keyboard-only run, Lighthouse, real GPU and phone check of the WebGL room | P0 · partly done | all P0 lots          | —             |

## Status on 2026-11-22

L0 to L9 are implemented on `feature/kanto-frontend` (30 test files, 138 tests, typecheck, lint and build green). L12 ran the end-to-end path in headless Chrome; the device passes remain. L10 and L11 are open. See [MVP-DEMO.md](MVP-DEMO.md).

## P0 backlog

1. L0 rename (done in this session).
2. L1 API layer and components.
3. L2 account screens on the Auth contract (mock + real paths).
4. L3 wizard and hub, including the import of a GLB/glTF model previewed in `ArtworkViewer`.
5. L4 item detail and verification page. Rule: an AI score is a hint with a confidence, never a proof; the "certified" word appears only after a human review and a confirmed mint.
6. L5 my space.
7. L6 scan session UI and contract; capture itself stays in the native app.
8. L12 demo validation.

## P1 backlog

- L7 administration (mocked review queue, approve / reject / request corrections).
- L8 museum polish from the A1–A6 frames.
- L9 discovery list with search and filters.
- Settle `/oeuvre/:id` vs the in-room notice as the canonical detail (both exist; the page is the shareable one).
- Visible credits line for CC BY-SA media, AAC or MP3 valiha for Safari (from the FE-02 follow-ups).

## P2 backlog

- Rooms 03 and 04 content treatments.
- AR Quick Look once 3D-05b validates it.
- Real NFT mint through the gateway (`POST /api/items/:id/mint`, polling `GET …/provenance`).
- Live LiDAR upload and conversion (3D-06), out of MVP by ADR 0001.
- Remove the motion lab and unused variants once Sesedra picks one.
- Frontend Dockerfile and Compose fragment (FE-05).

## Parallel work

After L1 lands, L2, L3 and L4 touch disjoint folders (`features/account`, `features/contribute`, `features/item` + `features/verification`) and can run in parallel. L5, L6 and L7 follow the same rule. Shared files are `app/routes.ts`, `app/App.tsx`, `lib/api/*` and `styles/tokens.css`; changes to them go in L1 or in a small integration commit.

## Risks carried into the plan

- Backend contracts are frozen for items, review, mint and 3D but do not exist as running services. All P0 lots therefore ship on the mock adapter first.
- The scan session contract is a frontend proposal. It must be agreed with the mobile and LiDAR owners before any real implementation.
- Administrative interfaces are outside the MVP scope recorded in `docs/product/MVP.md`; they are built as P1 and labelled as such.
