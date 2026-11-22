# Artiko API : fonctionnalités du backend et contrats pour le frontend

Référence écrite pour adapter un nouveau frontend à l'API existante. Elle résume `artiko-api/openapi.yml`
(la source de vérité, à régénérer côté client avec `pnpm api:generate`) et les règles métier lues dans le code
de l'API au 22 novembre 2026. En cas de doute, le fichier OpenAPI et `app/features/<feature>/service.py` font foi.

## 1. Vue d'ensemble

| Élément | Valeur |
|---|---|
| Base locale | `http://localhost:8000` |
| Base hébergée | `https://artiko-api.onrender.com` (instance gratuite, s'endort après 15 min, réveil en 30 à 45 s : appeler `/api/v1/health` avant une démo) |
| Préfixe | `/api/v1` pour tout, sauf `/media/<sha256>.<ext>` |
| Format | JSON ; envois de fichiers en `multipart/form-data` |
| Documentation live | `/docs` (Swagger), `/openapi.json` |
| Client généré | `artiko-web/src/lib/api-client/` via `@hey-api/openapi-ts` |

Conventions valables partout :

- **Erreurs** : toujours `{ "error": { "code": string, "message": string, ...détails } }`. Le `code` est stable et sert à traduire ; le `message` est en anglais. Un refus de publication pour copie ajoute `case_id`.
- **Mois** : chaîne `YYYY-MM` en UTC (`2026-11`). Les concours sont mensuels.
- **Pagination** : `limit` (1 à 200, défaut 100) et `offset` (défaut 0) sur les listes d'artistes et d'œuvres. Pas de total renvoyé : la page suivante se demande avec `offset += limit`, la fin est atteinte quand la page revient plus courte que `limit`.
- **URLs média** : absolues, servies par l'API (`/media/...`) ou par un bucket. Les images sont livrées telles quelles, sans redimensionnement ni vignette.
- **Identifiants** : UUID, sauf les pratiques du patrimoine (`kabary`) et les catégories (`painting`).
- **CORS** : seules les origines listées dans `CORS_ORIGINS` de l'API sont acceptées, méthodes `GET POST PUT OPTIONS`, en-têtes `Authorization` et `Content-Type`, `credentials` autorisés. **Un nouveau frontend sur une autre origine doit être ajouté à `CORS_ORIGINS`.**
- **En-têtes de sécurité** : `Cross-Origin-Resource-Policy: cross-origin` sur tout, donc les images et sons de `/media` s'affichent depuis n'importe quelle origine ; `X-Frame-Options: DENY`.
- **Débit** : les 429 portent un en-tête `Retry-After` en secondes et le code `rate_limited`.

## 2. Authentification

Les comptes ne vivent pas dans l'API mais dans **Better Auth, hébergé par artiko-web** sous `/api/auth/*`.
L'API ne fait que vérifier un **JWT EdDSA de 15 minutes** signé par Better Auth, publié sur `{web}/api/auth/jwks`,
avec `iss` et `aud` égaux à l'URL du web (`BETTER_AUTH_URL`). Revendications lues par l'API : `sub` (id utilisateur),
`email`, `name`, `role`. Le rôle `reviewer` ouvre les preuves privées.

Flux selon le client :

- **Frontend sur la même origine que Better Auth** (cas actuel) : `authClient.token()` donne le JWT, à envoyer en `Authorization: Bearer <jwt>`. Le helper `src/lib/api-token.ts` le garde en cache et le renouvelle une minute avant `exp`.
- **Frontend sur une autre origine** : Better Auth n'accepte les appels avec identifiants que depuis `trustedOrigins`, aujourd'hui limité à `BETTER_AUTH_URL`. Il faut soit héberger le nouveau frontend sur cette origine, soit ajouter son origine à `trustedOrigins` dans `artiko-web/src/lib/auth.ts`.
- **Client natif ou sans cookie** : `POST {web}/api/auth/sign-up/email` ou `sign-in/email` avec `{email, password, name?}`, lire l'en-tête de réponse `set-auth-token`, puis `GET {web}/api/auth/token` avec ce jeton de session en Bearer pour obtenir `{token}`, le JWT de l'API.

Règles côté Better Auth : e-mail et mot de passe seulement, mot de passe de 10 caractères minimum, 5 tentatives par minute et par IP sur la connexion et l'inscription. Pas de réinitialisation de mot de passe, pas de vérification d'e-mail, pas d'OAuth activés.

Côté API : `401` avec `unauthorized` ou `invalid_token` quand le JWT manque ou est invalide ; `403` avec `not_an_artist` quand l'utilisateur n'a pas encore créé son profil d'artiste.

## 3. Fonctionnalités, par domaine

### 3.1 Santé

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /health` | non | Le processus répond, sans toucher la base |
| `GET /ready` | non | La base répond aussi, sinon `503 not_ready` |

### 3.2 Mon compte

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /me` | oui | L'utilisateur connecté et son profil d'artiste, `artist` vaut `null` tant qu'il n'en a pas |
| `PUT /me/artist` | oui | Devenir artiste ou mettre à jour son profil : `{display_name, bio?, region?}` |

Il n'existe pas de suppression de compte ni de changement d'e-mail via l'API.

### 3.3 Artistes et musée 3D

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /artists?limit&offset` | non | Artistes triés par nom |
| `GET /artists/{artist_id}` | non | Un artiste |
| `GET /artists/{artist_id}/museum` | non | La salle 3D de l'artiste, calculée par l'API pour que web et Android affichent la même chose |

Règles de la salle (`app/features/museum/layout.py`) : une pièce centrée sur l'origine, entrée côté +z, largeur 10 m,
hauteur 4 m, profondeur `max(8, rangées × 3 + 2)`. Images et vidéos sont accrochées aux murs latéraux en alternant
gauche et droite tous les 3 m, centre à 1,6 m du sol, `rotation_y` de ±π/2. Modèles 3D et sons sont posés sur des
socles au milieu, à 1 m de haut. Les œuvres sont dans l'ordre de publication. Le frontend est libre d'ignorer cette
géométrie et de n'utiliser que la liste `slots[].work`.

### 3.4 Œuvres

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /categories` | non | Les 8 catégories `{id, label}` (libellés en anglais) |
| `GET /works?category&month&artist_id&exposition_id&limit&offset` | optionnelle | Œuvres, plus récentes d'abord. Avec un JWT, `proof_urls` inclut les preuves privées du propriétaire ou du relecteur |
| `GET /works/{work_id}` | optionnelle | Une œuvre |
| `POST /works` | artiste | Publier une œuvre avec ses preuves, en multipart |
| `GET /works/{work_id}/proofs` | oui | Les preuves que l'appelant peut ouvrir, avec des liens frais |
| `GET /proofs/{proof_id}/file?exp&sig` | non | Le fichier d'une preuve privée, via le lien signé qui expire après 300 s |

Publication (`POST /works`), champs du formulaire :

| Champ | Type | Règle |
|---|---|---|
| `title` | texte | obligatoire, 1 à 200 caractères |
| `category` | `CategoryId` | obligatoire |
| `file` | fichier | obligatoire, 20 Mo max ; image jpeg png webp, audio mpeg wav ogg, vidéo mp4 webm, 3D glb |
| `story` | texte | 5 000 caractères max |
| `ai_declared` | booléen | défaut `false` |
| `proof` | fichiers | jusqu'à 5, images audio ou vidéo, 20 Mo chacun |
| `proof_visibility` | `public` ou `reviewers` | défaut `reviewers` : seuls l'auteur et les relecteurs voient les preuves |
| `proof_claims` | JSON en texte | une revendication par preuve, `{source: "in_app"|"imported"}` ; les captures signées viennent de l'app Android |
| `exposition_id` | UUID | une exposition de l'artiste, sinon `400 invalid_exposition` |

Règles métier à refléter dans l'interface :

- `human_proven` est vrai quand l'œuvre a **au moins 2 preuves** et n'est **pas déclarée assistée par IA**. Tant que `ALLOW_IMPORTED_PROOFS_FOR_BADGE` reste vrai, les preuves importées comptent ; à terme seules les captures signées dans l'app compteront.
- Le même fichier ne peut pas être publié deux fois : `409 duplicate_work` sur le SHA-256.
- Une image trop proche d'une œuvre d'un autre artiste ou d'une œuvre connue (similarité CLIP ≥ 0,92 ou pHash à 8 bits ou moins) est refusée : `409 possible_copy` avec `error.case_id`. Il n'y a **aucun endpoint** pour consulter ou suivre ce dossier de révision.
- Une image proche d'une œuvre antérieure du même artiste est acceptée et les deux partagent un `series_id`.
- La réponse `201` est l'œuvre complète, votes à 0.
- Pas de modification ni de suppression d'œuvre, pas de brouillon : la publication est définitive.

### 3.5 Expositions

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /expositions?artist_id` | non | Expositions, plus récentes d'abord, avec `cover_url` et `works_count` |
| `GET /expositions/{exposition_id}` | non | Une exposition |
| `POST /expositions` | artiste | `{title, description?}` |

Les œuvres d'une exposition se listent avec `GET /works?exposition_id=…`. Pas de modification, de suppression, ni
d'ordre personnalisé des œuvres dans une exposition.

### 3.6 Votes et Panthéon

| Méthode et route | Auth | Rôle |
|---|---|---|
| `POST /votes` | oui | `{work_id}` : un vote par personne, par catégorie et par mois |
| `GET /votes/mine?month` | oui | Les votes de l'utilisateur pour le mois (défaut : mois courant) |
| `GET /hall-of-fame/{category}/{month}` | non | Les 5 meilleures œuvres de la catégorie pour le mois |

Refus de vote, tous en `400` sauf le dernier : `not_eligible` (œuvre sans badge humain), `not_in_contest` (publiée un
autre mois que le mois courant), `own_work`, et `409 already_voted` (déjà voté dans cette catégorie ce mois-ci).
Le Panthéon ne liste que des œuvres ayant au moins un vote, départagées par date de publication. Il n'y a pas de
retrait de vote, pas de classement général toutes catégories, pas d'historique autre que `votes/mine` par mois.

### 3.7 Indice du patrimoine vivant

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /practices` | non | Pratiques, les plus menacées d'abord |
| `GET /practices/{practice_id}` | non | Une pratique |

Le `status` est calculé : `red` si `learners < practitioners / 2` ou `median_age ≥ 60`, `orange` si
`learners < practitioners`, `green` sinon. Données statiques, pas d'écriture.

### 3.8 Scan d'une photo

| Méthode et route | Auth | Rôle |
|---|---|---|
| `POST /scan/image` | non | Identifier une œuvre photographiée, `file` en multipart, 5 Mo max, images seulement |

La photo n'est pas conservée. Ordre des vérifications : Content Credentials (C2PA) d'abord, qui donne `ai_made` si un
outil d'IA est nommé ; puis similarité CLIP contre les œuvres Artiko et les œuvres connues, seuil 0,85. Statuts :
`human_proven`, `artiko_work`, `known_work`, `ai_made`, `unknown`. `unknown` ne veut jamais dire « faux ».
`sources` donne des liens à afficher (vers la page de l'artiste pour une œuvre Artiko, vers le musée source pour une
œuvre connue). Limite : 20 scans par minute et par client, 120 pour tout le monde.

### 3.9 Appareils (Android uniquement)

`GET /devices/challenge` et `POST /devices` enregistrent la clé matérielle d'un téléphone pour signer les captures
de preuve. Sans équivalent possible dans un navigateur : le web publie ses preuves en `imported`.

### 3.10 Médias

`GET /media/<sha256>.<ext>` sert les fichiers des œuvres et des preuves publiques, hors schéma OpenAPI. Les preuves
privées ne passent jamais par là mais par les liens signés de `/proofs/{id}/file`.

## 4. Schémas

### Work

| Champ | Type | Note |
|---|---|---|
| `id`, `artist_id` | UUID | |
| `artist_name` | string | dénormalisé, évite un appel |
| `title`, `story` | string | |
| `category` | `CategoryId` | |
| `exposition_id` | UUID ou null | |
| `series_id` | UUID ou null | partagé par les quasi-copies d'un même artiste |
| `media_url` | URL absolue | |
| `media_kind` | `image` `audio` `video` `model` | |
| `proof_urls` | URL[] | dépend de l'appelant ; les privées expirent |
| `sha256` | hex 64 | empreinte du fichier |
| `human_proven`, `ai_declared` | bool | |
| `month` | `YYYY-MM` | mois du concours |
| `created_at` | date-time | |
| `votes` | entier | compteur du mois de l'œuvre |

### Artist : `id`, `display_name`, `bio`, `region`.

### Me : `id`, `email` (nullable), `name` (nullable), `artist` (Artist ou null).

### Museum : `artist`, `room {width, depth, height}` en mètres, `slots[] {work, kind: wall|plinth, position [x,y,z], rotation_y}`.

### Exposition : `id`, `artist_id`, `artist_name`, `title`, `description`, `cover_url` (nullable), `works_count`, `created_at`.

### Vote : `work_id`, `category`, `month`. HallOfFameEntry : `rank` 1 à 5, `work`, `votes`.

### Practice : `id`, `name`, `region`, `category`, `practitioners`, `learners`, `median_age`, `status`, `description`.

### ScanResult : `status`, `confidence` 0 à 1, `work` (Work ou null), `known` (KnownWork ou null), `sources[] {label, url}`.
KnownWork : `title`, `artist_name`, `date`, `museum`, `source_url`, `image_url`.

### Proof : `id`, `visibility`, `source` (`in_app` ou `imported`), `signed`, `url`.

### CategoryId : `painting`, `sculpture`, `photography`, `music`, `dance`, `oral_arts`, `crafts`, `digital`.

## 5. Codes d'erreur à gérer

| Code | HTTP | Quand |
|---|---|---|
| `invalid_request` | 422 | validation du corps ou des paramètres, le message nomme le champ |
| `unauthorized`, `invalid_token` | 401 | JWT absent, expiré ou invalide : rafraîchir le jeton puis rejouer |
| `not_an_artist` | 403 | action réservée aux artistes, proposer `PUT /me/artist` |
| `*_not_found` | 404 | ressource inconnue |
| `duplicate_work` | 409 | même fichier déjà publié |
| `possible_copy` | 409 | copie probable, `case_id` fourni |
| `already_voted` | 409 | un vote par catégorie et par mois |
| `not_eligible`, `not_in_contest`, `own_work` | 400 | vote refusé |
| `invalid_exposition` | 400 | exposition d'un autre artiste ou inconnue |
| `bad_signature`, `unknown_device`, `capture_too_old`, `capture_in_future`, `integrity_failed`, `incomplete_capture`, `invalid_proof_claims` | 400 | revendications de capture, Android |
| `file_too_large` | 413 | 20 Mo pour une œuvre, 5 Mo pour un scan |
| `rate_limited` | 429 | lire `Retry-After` |
| `invalid_link` | 403 | lien de preuve expiré ou falsifié |
| `not_ready` | 503 | base injoignable |
| `internal_error` | 500 | erreur serveur, détail dans les journaux seulement |

## 6. Limites et quotas

| Limite | Valeur |
|---|---|
| JWT | 15 min, à renouveler avant `exp` |
| Page | 100 par défaut, 200 max |
| Fichier d'œuvre ou de preuve | 20 Mo, 5 preuves max |
| Photo de scan | 5 Mo |
| Scan | 20 / min / client, 120 / min au total |
| Fichier de preuve privée | 60 / min / client, 600 / min au total, lien valable 300 s |
| Appareils | 20 / min / client, 200 / min au total |
| Connexion et inscription | 5 / min / IP |

## 7. Données réellement présentes sur l'API hébergée

Au 22 novembre 2026, sur `artiko-api.onrender.com` :

- 4 artistes : Hei (Analamanga), Hery Andrianina (Ambositra), Rova Rasoanaivo (Antananarivo), Voahangy Rakoto (Mahajanga).
- 15 œuvres, toutes des images, avec 2 preuves et le badge humain ; aucune œuvre audio, vidéo ou 3D pour tester ces rendus.
- 6 expositions, deux par artiste, 3 et 2 œuvres chacune.
- Panthéon `painting` du mois courant rempli avec 5 entrées ; les autres catégories peuvent être vides.
- 6 pratiques du patrimoine, toutes à Madagascar : kabary, valiha, zafimaniry-woodcraft (rouge), hiragasy, lamba-landy (orange), antemoro-paper (vert).
- Les libellés de catégories et le `message` des erreurs sont en anglais : le frontend traduit à partir des `id` et des `code`.

## 8. Ce que le backend ne fournit pas aujourd'hui

À prévoir côté frontend, ou à demander au backend avant de dessiner l'écran :

- Recherche plein texte, tri, filtre par région ou par artiste sur `/artists`.
- Total d'éléments pour une pagination numérotée.
- Modification et suppression d'œuvre, d'exposition ou de profil d'artiste ; réorganisation des œuvres.
- Vignettes ou tailles d'image : une seule URL, le fichier original.
- Suivi, favoris, commentaires, notifications, messagerie.
- Suivi d'un dossier `possible_copy` ou interface de relecture : les relecteurs n'ont que l'accès aux preuves privées.
- Classement global ou archives multi-mois en un appel : un appel par catégorie et par mois.
- Réinitialisation de mot de passe, vérification d'e-mail, connexion sociale.
- Détail d'une œuvre connue hors d'un scan, ni liste des œuvres connues indexées.
- Statistiques d'artiste (vues, votes cumulés) ; seul `votes` par œuvre et par mois existe.

## 9. Liste de contrôle pour brancher un nouveau frontend

1. Ajouter l'origine du frontend à `CORS_ORIGINS` de l'API et, si elle diffère de `BETTER_AUTH_URL`, à `trustedOrigins` de Better Auth.
2. Générer le client depuis `artiko-api/openapi.yml` plutôt que d'écrire les types à la main.
3. Centraliser le jeton : cache, renouvellement une minute avant `exp`, vidage à la déconnexion et après une connexion.
4. Traduire les `error.code` ; afficher `error.message` seulement en repli.
5. Gérer `429` avec `Retry-After`, surtout sur le scan.
6. Envoyer `Authorization` aussi sur `GET /works` et `GET /works/{id}` quand l'utilisateur est connecté, sinon les preuves privées manquent.
7. Ne jamais mettre en cache une URL de `proof_urls` privée : elle expire après 5 minutes.
8. Prévoir les rendus `audio`, `video` et `model` même si les données de démo n'en ont pas.
9. Réveiller l'instance Render avec `/health` au chargement de l'application.
