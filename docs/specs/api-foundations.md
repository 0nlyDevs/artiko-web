# Spécification : fondations de l'alignement sur le contrat de l'API (erreurs, jeton, pagination)

- Branche : `feat/api-foundations`, partie de `origin/develop` (`647cdba`).
- Contrat lu : `artiko-api/openapi.yml` sur `main` (`43f13ab`) et `origin/develop` (`156f568`) ; le client de `src/lib/api-client` est généré depuis celui de `develop`.
- Source des constats : inventaire des écarts web / API du 2026-11-22 (E02, E03, E04, E05, E06, E08, E09).

## Objectif

L'application appelle l'API sans traiter plusieurs cas que le contrat prévoit : un jeton refusé n'est jamais renouvelé, les refus s'affichent en anglais avec le message de l'API, une partie de la réponse d'erreur est perdue, et deux listes sont lues sur une seule page. Cette branche pose les fondations communes, sans aucun changement visuel : une erreur complète, un appel authentifié qui se rejoue, une table unique des codes d'erreur traduits, une aide pour les catégories et une lecture page par page.

## Histoire utilisateur

En tant que personne connectée sur Artiko, je veux que mon action aboutisse même si mon jeton vient d'expirer, et que chaque refus me soit expliqué dans ma langue, afin de ne pas rester devant un message en anglais ou un échec que je ne comprends pas.

## Critères d'acceptation

**CA1 : l'erreur garde tout ce que l'API envoie.**
- Étant donné une réponse d'erreur de l'API,
- quand `unwrap` la transforme en `ApiError`,
- alors l'erreur porte `status`, `code`, `message`, plus `caseId` (le `case_id` d'un 409 `possible_copy`, sinon `null`) et `retryAfter` (secondes, sinon `null`).
- `Retry-After` est lu en secondes entières ou en date HTTP (`Sun, 22 Nov 2026 10:01:30 GMT`) convertie en secondes à partir de maintenant ; il vaut `null` si l'en-tête est absent ou illisible, c'est-à-dire sous toute autre forme (`-5`, `1.5`, du texte).
- Le 404 par défaut du framework (`{"detail": "Not Found"}`) donne le code `not_found` ; un appel sans réponse garde le code `unreachable`.

**CA2 : une seule demande de jeton à la fois.**
- Étant donné plusieurs appels simultanés à `getApiToken`,
- alors une seule requête part vers `/api/auth/token` et tous reçoivent le même jeton.
- `clearApiToken` (connexion, déconnexion) oublie aussi la requête en cours : sa réponse n'est pas mise en cache.

**CA3 : un jeton refusé est renouvelé, l'appel rejoué une fois.**
- Étant donné un appel passé par `callWithToken`,
- quand l'API répond 401 avec le code `unauthorized` ou `invalid_token`,
- alors le jeton refusé est retiré du cache, un nouveau jeton est demandé et l'appel est rejoué une seule fois.
- Le rejeu n'a lieu que si le nouveau jeton est celui du même compte (même revendication `sub`) : sinon le 401 d'origine est levé.
- Un second 401 est levé tel quel ; toute autre erreur est levée sans rejeu ; sans jeton, le 401 `unauthorized` existant est levé sans appeler l'API.
- Quand `/api/auth/token` répond par une erreur autre que 401 (429, 5xx), l'erreur levée porte ce statut et le code `unreachable`, pas `unauthorized`.
- Passent par `callWithToken` : le vote, le chargement de « mon espace », le profil, la création d'exposition et la publication (deux appels séparés, pour qu'un rejeu de la publication ne crée pas l'exposition deux fois).

**CA4 : « mon espace » lit ses œuvres avec le jeton.**
- Étant donné une personne connectée, `listWorks` (ses œuvres) et `getWork` (les œuvres pour lesquelles elle a voté) envoient le jeton. Les lectures faites par le serveur restent sans jeton.

**CA5 : une seule table pour les codes d'erreur.**
- Étant donné une `ApiError`, `apiErrorText` (`src/lib/api-messages.ts`) renvoie le texte traduit (en, fr, mg) si le code est connu, sinon le message de l'API.
- `unreachable` et l'absence de jeton (`unauthorized`) ont une phrase traduite ; celle de `unreachable` ne nomme pas le produit.
- Le formulaire de profil, la publication, la vérification de photo, « mon espace » et le vote passent par cette table. Les cinq textes du vote et le texte de « mon espace » pour `email_not_verified` (`space.unverified`) ne changent pas.
- Pour `file_too_large`, `empty_file` et `unsupported_file`, le texte garde le nom du fichier refusé (et la limite dépassée), lus au début du message de l'API ; si le message n'a pas la forme attendue, la phrase sans nom s'affiche.

**CA6 : les catégories passent par une seule aide.**
- Étant donné un identifiant de catégorie, `categoryLabel` (ou le composant `CategoryLabel`) renvoie la traduction du dictionnaire, sinon le libellé envoyé par l'API quand l'appelant le possède, sinon un texte vide (jamais l'identifiant brut). Les huit catégories actuelles gardent exactement leur texte.

**CA7 : les listes présentées comme complètes sont lues page par page.**
- Étant donné `readAll` (`src/lib/paging.ts`), la liste est lue avec `limit` et `offset` jusqu'à la première page plus courte que `limit`, avec un plafond de 1000 éléments. Un `limit` qui n'est pas un entier d'au moins 1, ou un plafond non fini, est refusé (`RangeError`) avant toute lecture.
- Elle sert à deux endroits : les œuvres de l'artiste dans « mon espace » (l'en-tête les compte), et les artistes parcourus par la recherche d'Explorer. Sans recherche, Explorer lit toujours une seule page.

## Hors périmètre

- Appel de réveil vers `/api/v1/health`.
- Raisons affichées côté client quand le vote est désactivé.
- Envoi de `proof_claims` à la publication.
- Adresse de retour après la connexion.
- Toute refonte visuelle : aucun balisage, aucune classe ni mise en page ne change, seul le texte de certains messages d'erreur.
- Usage à l'écran de `caseId` et de `retryAfter` : ils sont seulement conservés.

## Cas limites et erreurs

- **Deux appels refusés en même temps.** Chacun ne retire du cache que le jeton qu'il a envoyé, puis ils partagent la même demande de jeton : un seul renouvellement.
- **Appel lent refusé après un renouvellement.** Le jeton déjà renouvelé est gardé et sert au rejeu.
- **Jeton dont l'expiration est illisible.** Il n'est jamais mis en cache (comportement inchangé) ; seules les demandes simultanées sont partagées.
- **Session terminée entre l'appel et son rejeu.** Le 401 `unauthorized` est levé : le vote propose de se connecter, « mon espace » affiche « Connectez-vous d'abord ».
- **Autre compte connecté pendant un appel** (déconnexion puis connexion dans le même onglet, ou changement de compte dans un autre onglet, pendant un envoi long). Le jeton renouvelé n'a pas le même `sub` que le jeton refusé : l'appel n'est pas rejoué et le 401 d'origine est levé. Sans cela, l'œuvre ou le vote de la première personne partirait sous le compte de la seconde. Un jeton dont le `sub` est illisible n'est pas rejoué non plus.
- **Nouveau jeton refusé lui aussi.** Le second 401 `invalid_token` atteint l'écran : « Nous n'avons pas pu confirmer votre connexion… ». Le texte ne parle pas de session expirée, car une session terminée donne `unauthorized` ; ce cas vient de l'API (clés de signature illisibles, émetteur mal réglé).
- **`/api/auth/token` en panne** (réponse 429 ou 5xx alors que la session est valide). L'erreur porte le code `unreachable` : « mon espace » affiche « Votre espace n'a pas pu se charger… », le vote, le profil et la publication « Le service n'a pas répondu… ». Seul le 401 de Better Auth (personne n'est connecté) donne `unauthorized`.
- **`/api/auth/token` injoignable** (pas de réseau). Le client Better Auth rejette avec un `TypeError` : chaque écran affiche son texte d'échec général (`space.error`, `vote.failed`, `profile.failed`, `publish.failed`), comme avant.
- **`Retry-After` dans un navigateur.** L'API n'expose pas l'en-tête aux autres origines (`artiko-api/app/main.py:29-35`, pas d'`expose_headers`) : `retryAfter` vaut `null` tant que ce n'est pas corrigé côté API.
- **Réponse qui n'a pas la forme de l'API** (page HTML d'un proxy, 502) : code `unreachable`, statut conservé.
- **Œuvre votée illisible.** La ligne du vote reste sans œuvre, comme avant.
- **Catégorie inconnue du dictionnaire.** Là où seule l'œuvre ou la pratique est connue, l'API n'envoie pas de libellé : rien ne s'affiche, comme avant. Là où la catégorie entière est connue (« mon espace », publication), le libellé de l'API s'affiche.
- **Liste de plus de 1000 éléments.** Elle est coupée à 1000, comme une page unique la coupait à 200 ou 100.
- **Fichier refusé sans nom lisible.** Si le message de l'API change de forme ou ne nomme pas le fichier (`None`), la phrase sans nom s'affiche (« Un fichier dépasse la taille maximale. »).

## Contraintes techniques

- **Versions** (lues dans `node_modules/*/package.json`) : `next` 16.4.6, `better-auth` 1.7.27, `@hey-api/openapi-ts` 0.99.0. `cacheComponents` est actif : rien de ce qui porte un jeton ne s'exécute sous `"use cache"` ; `callWithToken` ne sert que dans le navigateur.
- **Pagination de l'API** : `limit` de 1 à 200 (100 par défaut), `offset` (`artiko-api/app/platform/pagination.py:8-9`).
- **Jeton facultatif** : sur `GET /works` et `GET /works/{id}`, un jeton présent mais faux répond 401 (`artiko-api/app/platform/auth.py:100-105`) ; avec un jeton valide, l'artiste reçoit aussi les liens de ses preuves réservées au jury (`app/features/works/proofs.py`).
- **Client généré** : un `fetch` qui échoue est rendu sans `response` (`src/lib/api-client/client/client.gen.ts`), d'où le code `unreachable`. `src/lib/api-client` n'est pas modifié.
- **Dépendances** : aucune nouvelle.

### Liste de référence des codes

Lue dans `openapi.yml` et dans `app/` (classes de `app/platform/errors.py`), sur `main` et `origin/develop`.

| Codes | Origine | Texte |
|---|---|---|
| `unauthorized`, `invalid_token` | `platform/auth.py` | `api.unauthorized`, `api.invalid_token` |
| `email_not_verified` | `platform/auth.py` de `origin/feat/verified-email-tokens` (`1fb969e`, pas encore dans `main` ni `develop`) | `vote.emailNotVerified` ; `space.unverified` dans « mon espace » |
| `rate_limited` | `platform/rate_limit.py` | `auth.tooMany` |
| `file_too_large`, `empty_file`, `unsupported_file` | `platform/storage.py` | `api.<code>.named` avec le nom du fichier ; `api.<code>` si le message ne le donne pas |
| `invalid_request`, `internal_error` | `platform/errors.py` | `api.invalid_request`, `api.internal_error` |
| `not_eligible`, `not_in_contest`, `own_work`, `already_voted` | `features/votes/service.py` | `vote.notEligible`, `vote.notInContest`, `vote.own_work`, `vote.already_voted` |
| `work_not_found`, `artist_not_found`, `exposition_not_found`, `practice_not_found`, `media_not_found`, `proof_not_found` | `features/works`, `votes`, `artists`, `expositions`, `practices`, `media` | `api.work_not_found`, `api.artist_not_found`, `api.exposition_not_found`, `api.practice_not_found`, `api.file_not_found` (deux derniers codes) |
| `not_an_artist`, `invalid_exposition`, `too_many_proofs`, `duplicate_work` | `features/works/service.py`, `features/expositions/service.py` | `api.<code>` |
| `possible_copy` | `features/integrity/service.py` | `api.possible_copy` |
| `extras_need_model`, `invalid_model_hd`, `invalid_poster` | `features/works/service.py`, `develop` seulement | `api.<code>` |
| `invalid_link` | `features/works/router.py` | `api.invalid_link` |
| `not_an_image` | `features/scan/router.py` | `api.not_an_image` |
| `not_ready` | `features/health/router.py` | `api.not_ready` |
| `unreachable`, `not_found` | `src/lib/api.ts` (pas de réponse à la forme de l'API ; 404 du framework) | `api.unreachable`, `api.not_found` |
| `nonce_unavailable`, `invalid_nonce`, `invalid_public_key`, `invalid_attestation`, `invalid_proof_claims`, `incomplete_capture`, `unknown_device`, `capture_too_old`, `capture_in_future`, `bad_signature`, `integrity_failed`, `integrity_unavailable` | `features/devices/service.py`, `features/works` (`proof_claims`), `platform/integrity.py` | Aucun : message de l'API |

Les douze codes de la dernière ligne ne naissent que de l'enregistrement de la clé matérielle d'un téléphone (`/devices`) ou de l'envoi d'une capture signée dans l'application (`proof_claims`). Le web n'appelle pas ces routes et n'envoie pas ce champ.

## Impact sur l'architecture

- **Infrastructure (`src/lib/`)** :
  - `api.ts` : `ApiError` gagne `caseId` et `retryAfter`, `unwrap` les remplit et nomme `not_found`.
  - `api-token.ts` : requête de jeton partagée, `callWithToken`.
  - `api-messages.ts` (nouveau) : table des codes, `apiErrorKey`, `apiErrorText`.
  - `paging.ts` (nouveau) : `readAll`.
  - `works/category-label.tsx` : `categoryLabel` à côté du composant `CategoryLabel`.
- **Interface** :
  - `features/artist-space/load-space.ts` (nouveau) : le chargement de « mon espace », sorti de `my-space.tsx` pour être testé ;
  - `my-space.tsx`, `profile-form.tsx`, `publish-form.tsx`, `features/scan/scan-form.tsx`, `lib/works/vote.tsx` : `callWithToken` et `apiErrorText` ;
  - `features/explore/explore-page.tsx` : `readAll` pour les artistes d'une recherche ;
  - `artist-profile.tsx`, `heritage-page.tsx`, `work-sheet.tsx`, `work-tile.tsx`, `vote.tsx`, `my-space.tsx` : catégories par l'aide commune.
- **Dictionnaires** : 28 clés `api.*` dans `src/i18n/en.ts`, `fr.ts` et `mg.ts` ; malgache à faire relire (`src/i18n/MG_REVIEW.md`).
- **Parcours navigateur** : `e2e/api-foundations.e2e.ts` (nouveau) ; `e2e/support/browser.ts` fixe la langue du navigateur (anglais par défaut) pour que les parcours ne dépendent pas de la langue du poste.

## Plan de test

Tests automatisés (vitest) :

- **CA1** `src/lib/api.test.ts` : `case_id` conservé ; `Retry-After` en secondes, en date, absent, illisible (quatorze formes) ; 404 du framework et ses deux contre-exemples (404 sans le corps du framework, corps du framework sur un autre statut) ; message égal au code quand l'API n'en donne pas ; appel sans réponse ; réponse hors forme de l'API.
- **CA2, CA3** `src/lib/api-token.test.ts` : une requête pour des appels simultanés ; un rejeu après un 401 `unauthorized` ou `invalid_token` ; second 401 levé ; pas de rejeu sur une autre erreur, ni sur ces deux codes hors statut 401 ; pas de jeton ; `/api/auth/token` en panne (429, 500, 503) ; session terminée avant le rejeu ; pas de rejeu avec le jeton d'un autre compte (même onglet, autre onglet) ni avec un `sub` illisible ; deux appels refusés ensemble ; appel lent refusé après un renouvellement.
- **CA3, CA4, CA7** `src/features/artist-space/load-space.test.ts`, avec le vrai client et un `fetch` simulé : jeton sur `/works` et `/works/{id}`, pages `offset=0` puis `offset=200`, lectures publiques sans jeton, vote sans œuvre lisible, jeton refusé puis renouvelé, `/api/auth/token` en panne, `email_not_verified`.
- **CA5** `src/lib/api-messages.test.ts` : chaque code de la liste de référence a un texte en en, fr et mg ; code inconnu et codes Android renvoient le message de l'API ; textes du vote et de « mon espace » ; `unreachable` sans nom de produit ; nom du fichier refusé gardé, phrase sans nom sinon ; `invalid_token` sans mention de session expirée ; table protégée contre le prototype.
- **CA6** `src/lib/works/category-label.test.tsx` : traduction, repli sur le libellé de l'API, texte vide sans libellé.
- **CA7** `src/lib/paging.test.ts` : arrêt sur une page courte, sur une page vide, au plafond ; `limit` et plafond refusés quand ils ne peuvent pas terminer la lecture.
- **Dictionnaires** : `src/i18n/locales.test.ts` (mêmes clés dans les trois langues).
- **Commandes** : `tsc --noEmit`, `eslint`, `vitest run`.

Parcours dans un vrai navigateur (`pnpm test:e2e`, hors CI comme `e2e/lidar-import.e2e.ts` : reconstruit `.next` face à une fausse API et demande Chrome) :

- **CA2 à CA5, CA7** `e2e/api-foundations.e2e.ts` : le câblage des écrans, que `vitest run` n'atteint pas faute de DOM. « Mon espace » (pages avec jeton, jeton refusé puis renouvelé, second refus, `email_not_verified` avec son bouton, autre refus traduit, `/api/auth/token` en panne), profil, vote (refus connu, rejeu, visiteur non connecté), vérification de photo, publication (rejeu sans seconde exposition, refus traduit, fichier nommé), recherche d'Explorer.
- Ces écrans n'ont pas de test dans `vitest run` : une retouche qui retire `callWithToken` ou `apiErrorText` d'un écran n'est vue que par ce parcours.

Vérifications manuelles :

- Face à la vraie API : publier une œuvre avec une preuve de plus de 20 Mo et lire le nom du fichier dans le refus.
- Changer de compte dans un autre onglet pendant un envoi long : rien n'est publié sous le second compte.

## Choix par défaut retenus

- Le message d'une `ApiError` sans message de l'API est son code ; le texte lu par la personne vient toujours de la table.
- `rate_limited` réutilise `auth.tooMany` : même limite par minute, même phrase.
- `email_not_verified` garde `vote.emailNotVerified` comme texte général, et `space.unverified` dans « mon espace », qui garde aussi `space.error` pour `unreachable`.
- `media_not_found` et `proof_not_found` partagent `api.file_not_found`.
- Les codes de la capture Android gardent le message de l'API.
- Un jeton refusé n'est rejoué que pour le même compte ; sans `sub` lisible, pas de rejeu.
- Une panne de `/api/auth/token` se lit comme un service qui n'a pas répondu (`unreachable`), y compris pour le vote, qui proposait auparavant de se connecter.
- `Retry-After` : seule la date HTTP au format courant (IMF-fixdate) est lue ; les deux formats obsolètes de la RFC 9110 donnent `null`.
- Une catégorie sans traduction ni libellé n'affiche rien plutôt que son identifiant.
- Explorer ne lit toutes les pages d'artistes que s'il y a une recherche.
- Plafond de `readAll` : 1000 éléments, soit cinq pages de 200.

## Questions ouvertes

- `Retry-After` : l'API doit l'ajouter à `Access-Control-Expose-Headers` pour que le navigateur le lise.
- Relecture des 28 nouvelles lignes malgaches.
- Libellé de l'API pour une catégorie inconnue là où seule l'œuvre est connue : il faudrait y lire `GET /categories` ; en attendant rien ne s'affiche.
- Nom du fichier refusé : il est lu dans le message anglais de l'API ; un champ dédié dans l'erreur (comme `case_id`) serait plus sûr.
- `retryAfter` n'a pas de borne haute : à décider quand un écran s'en servira.
- `invalid_proof_claims` : à traduire quand le web enverra `proof_claims`.
- Un échec réseau de `/api/auth/token` rejette avec un `TypeError` et donne le texte d'échec général de chaque écran : faut-il le rendre lui aussi en `unreachable` ?
