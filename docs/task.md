# Audit artiko-web : correctifs à faire

Audit en lecture seule du 2026-11-22. Code lu sur `main` (`6535946`) ; `develop` ne diffère que par
l'outillage (CI, mise, Taskfile, hook pre-commit) : `src/` et `next.config.ts` sont identiques.
Chaque point cite `fichier:ligne`. Non exécuté : `pnpm audit` (pnpm absent de la session d'audit).

Points forts déjà en place : TypeScript strict, en-têtes de sécurité (`next.config.ts:11`), rate limit
Better Auth stocké en base, refus de démarrer sans `AUTH_CLIENT_IP_HEADER` fiable (`src/lib/auth.ts:30`),
cache JWT vidé à la connexion, CI durcie sur `develop` (actions épinglées par SHA, `permissions`,
gitleaks, `push` sur `develop`).

## 🔴 Sécurité / intégrité (priorité haute)

- [ ] **1. Comptes jetables → votes multiples.** Email/mot de passe sans vérification d'email
  (`src/lib/auth.ts:45`, pas de `requireEmailVerification`). N'importe qui crée des comptes en boucle
  (5/min/IP, `auth.ts:52`) et vote avec chacun. → Exiger un email vérifié, au moins pour voter
  (côté web et côté API, voir `artiko-api/docs/task.md` point 8).
- [ ] **2. Cache du JWT partagé entre comptes.** `src/lib/api-token.ts:6` garde le token au niveau du
  module ; `clearApiToken()` n'est appelé que dans `auth-form.tsx:31` et `my-space.tsx:52`. Déconnexion
  puis reconnexion avec un autre compte dans un autre onglet → l'onglet d'origine envoie le token du
  premier compte jusqu'à expiration. → Lier le cache à `session.user.id` ou le vider au changement de
  session.
- [ ] **3. `search_path` et pooler Neon.** `auth.ts:36` fait un `SET search_path` de session. Si
  `DATABASE_URL` pointe sur l'hôte `-pooler` (PgBouncer en mode transaction), ce réglage n'est pas
  garanti d'une requête à l'autre (non vérifié : URL de prod inconnue). → `options: "-c search_path=better_auth"`
  dans le `Pool`, ou connexion directe.
- [ ] **4. CSP minimale** (`next.config.ts:5`) : pas de `script-src` (assumé dans le commentaire). C'est la
  principale protection XSS absente ; chantier nonces à planifier.

## 🟠 Bugs

- [ ] **5. Éligibilité au vote décidée par l'horloge du client** (`src/features/artist-museum/vote-button.tsx:18`) :
  `currentMonth()` lu au rendu d'un composant client aussi rendu côté serveur → divergence serveur /
  hydratation au changement de mois. → Laisser l'API trancher ou passer l'info depuis le serveur (comme
  `canGoNext` du Hall of Fame).
- [ ] **6. Course dans le scan** (`src/features/scan/scan-form.tsx:16`) : deux fichiers enchaînés, la réponse
  la plus lente écrase la plus récente ; `URL.createObjectURL` jamais libéré (`revokeObjectURL`).
- [ ] **7. `MySpace`** (`src/features/artist-space/my-space.tsx:21`) : effet non annulé, `failed` jamais
  remis à `false` (pas de nouvel essai), dépendance à l'objet `session` (relance à chaque référence).
- [ ] **8. Détection des preuves image** (`src/features/artist-museum/museum-view.tsx:84`) : la regex
  `/\.(jpg|png|webp)$/` rate `.jpeg`, les majuscules et les query strings. → `media_kind` par preuve
  renvoyé par l'API.
- [ ] **9. `scene.clone()` à chaque rendu** (`src/features/artist-museum/museum-3d.tsx:126`) → `useMemo`.
- [ ] **10. `PublishForm`** (`src/features/artist-space/publish-form.tsx`) : formulaire non vidé après
  succès (double envoi = doublon) ; `select` requis vide si `categories` est vide, sans message.
- [ ] **11. Promesses non gérées** : `src/components/gallery/Overlays.tsx:126` (`play().then` sans
  `catch`) ; `src/components/gallery/Scene.tsx:154` (`fetch` sans contrôle de `r.ok`).
- [ ] **12. Pas de timeout sur les appels serveur à l'API** (explore, hall-of-fame, heritage, artists) :
  une API lente bloque le rendu. → `AbortSignal.timeout(...)` via `client.setConfig` (`src/lib/api.ts:5`,
  option à vérifier dans la doc `@hey-api/client-fetch`).
- [ ] **13. Double fetch du musée** (`src/app/(app)/(pages)/artists/[id]/page.tsx:5` et `:10`) :
  `generateMetadata` et la page appellent `loadMuseum`. → `React.cache`.

## 🟡 Architecture / dette

- [ ] **14. Route `/museum` héritée de LOVA**, liée nulle part : GSAP 3.12.5 vendoré (3.13.0 en
  dépendance), Lenis et `three.module.js` en double, ~11 Mo dans `public/museum`,
  `dangerouslySetInnerHTML` + `innerHTML` (données statiques, pas de XSS aujourd'hui), faux événement
  `pagehide` pour le nettoyage. Le renommage #19 l'a ratée : « lova » / « LOVA » dans
  `src/features/museum/museum-markup.ts`, `public/museum/app.js:18`, `:81`, `:84`, `:133`, favicon « L »
  dans `src/app/(museum)/layout.tsx:9`. → Supprimer (en gardant les assets réutilisés par la galerie :
  `landscape.glb`, `satie-*`, `monet.webp`) ou porter en React.
- [ ] **15. Messages d'erreur bruts de l'API / Better Auth affichés** (auth, publication, profil, scan) :
  en anglais quelle que soit la langue. → Mapper les codes vers l'i18n, comme `REFUSED` dans
  `vote-button.tsx:10`.
- [ ] **16. Constante d'UI mal placée** : `field` exportée par `profile-form.tsx:9` et importée par
  `auth-form` et `publish-form`. → Module partagé (`src/components/ui`).
- [ ] **17. `error.tsx`** (`src/app/(app)/(pages)/error.tsx`) ignore `error` (ni log ni `digest`) ; pas de
  `not-found.tsx` ni de `global-error.tsx`.
- [ ] **18. Handler auth reconstruit à chaque requête** (`src/app/api/auth/[...all]/route.ts:4`) :
  mémoriser `toNextJsHandler(getAuth())`.
- [ ] **19. Couverture de tests** : seuls `src/lib/` et `src/i18n/` sont testés ; rien sur formulaires,
  vote, scan ni `canGoNext`.

## Non vérifié

- Comportement de React 19 sur les `href` en `javascript:` venant de l'API (`s.url` du scan,
  `proof_urls`) : a priori neutralisés, à confirmer ; une validation `https:` côté API reste conseillée.

## Ordre suggéré

1, 2, 3 et 5 d'abord, puis 6, 7, 12 et 14.
