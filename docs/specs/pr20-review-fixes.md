# Spécification : correctifs bloquants de la revue de la PR #20

- Branche : `fix/pr20-review`, partie de `origin/feat/redesign-verified-accounts` (`c5a81b0`).
- PR cible : `feat/redesign-verified-accounts` (PR #20 de Tafita Mathieu), pas `develop`.
- Source des constats : relecture à trois relecteurs (bugs, cas limites, sécurité) du 2026-11-22.

## Objectif

La PR #20 rend la vérification d'email obligatoire et refond l'application. La revue y a trouvé six problèmes à corriger avant le merge :

- une prise de contrôle possible d'un compte créé d'avance ;
- des messages d'erreur trompeurs (panne de Have I Been Pwned, mot de passe trop long) ;
- un défaut de typage de la table des codes d'erreur ;
- les crédits perdus des fichiers que la galerie utilise encore ;
- deux fuites possibles de données dans les logs d'email.

Cette branche corrige ces six points sans rien changer d'autre à la PR.

## Histoire utilisateur

En tant que personne qui s'inscrit sur Artiko, je veux que mon compte ne puisse pas être piégé par quelqu'un qui l'aurait créé avant moi, et que chaque refus m'explique quoi faire, afin de garder le contrôle de mon compte et de ne pas rester bloqué sur un message générique.

## Critères d'acceptation

**CA1 : pas de session ouverte par le lien de vérification.**
- Étant donné un compte non vérifié,
- quand la personne ouvre le lien de vérification,
- alors l'adresse est marquée vérifiée, aucune session n'est créée (`emailVerification.autoSignInAfterVerification` vaut `false`), et la personne arrive sur `/sign-in?verified=1`. La page affiche « Adresse confirmée, connectez-vous » (clé `auth.verified`, en en, fr et mg).
- Les liens envoyés depuis l'inscription et depuis la connexion (renvoi du lien) utilisent ce même `callbackURL`, défini dans une seule constante.

**CA2 : panne de Have I Been Pwned annoncée clairement.**
- Étant donné que `api.pwnedpasswords.com` est injoignable ou répond une erreur,
- quand la personne s'inscrit ou choisit un nouveau mot de passe,
- alors l'opération reste refusée (comportement bloquant conservé). Le serveur renvoie le code `PASSWORD_CHECK_UNAVAILABLE` au lieu de la 500 générique, et le formulaire affiche la clé `auth.checkUnavailable` (« La vérification du mot de passe est momentanément indisponible. Réessayez dans quelques minutes. », en en, fr et mg).
- Un mot de passe réellement compromis renvoie toujours `PASSWORD_COMPROMISED`, affiché avec `auth.compromised`.

**CA3 : limite de 128 caractères partagée entre serveur et formulaires.**
- Étant donné `MAX_PASSWORD_LENGTH = 128` exporté par `src/lib/password.ts`,
- quand on configure Better Auth et qu'on affiche les formulaires d'inscription et de réinitialisation,
- alors :
  - `auth.ts` passe `maxPasswordLength: MAX_PASSWORD_LENGTH` ;
  - les champs mot de passe des deux formulaires ont `maxLength={MAX_PASSWORD_LENGTH}` ;
  - `passwordProblems` renvoie `tooLong: true` au-delà de 128 caractères ;
  - le code serveur `PASSWORD_TOO_LONG` est traduit par la clé `auth.tooLong` (en, fr, mg).

**CA4 : la table des codes d'erreur ne lit pas le prototype.**
- Étant donné une erreur dont le `code` vaut `constructor`, `__proto__`, `toString` ou `hasOwnProperty`,
- quand on appelle `authErrorKey`,
- alors la fonction renvoie `auth.unexpected`. Les codes connus continuent de renvoyer leur clé.

**CA5 : les fichiers de la galerie sont déplacés et crédités.**
- Étant donné les quatre fichiers que la galerie utilise encore (`monet.webp`, `satie-excerpt.mp3`, `satie-waveform.json`, `landscape.glb`),
- quand la branche est appliquée,
- alors :
  - les quatre fichiers sont dans `public/gallery/` ;
  - leurs quatre références dans `src/components/gallery/` pointent vers `/gallery/…` ;
  - aucune chaîne `/museum/` ne reste dans `src/` en dehors de la route `/artists/[id]/museum` ;
  - le dossier `public/museum/` n'existe plus.
- Et `public/gallery/sources.json` contient une entrée par fichier avec `file`, `title`, `artist`, `date`, `source_url` et `rights`. Leur contenu :
  - Monet : *Water Lilies*, 1906, Art Institute of Chicago, domaine public, lien Wikimedia Commons ;
  - Satie : *Gymnopédie n° 1*, 1888, enregistrement de Teknopazzo sous CC0 1.0, lien Wikimedia Commons. La waveform est indiquée comme dérivée de cet enregistrement ;
  - `landscape.glb` : `source_url` vide et `rights: "Source to be confirmed"`, car l'historique git ne documente pas son origine.

**CA6 : pas de données personnelles ni de jeton dans les logs d'email.**
- Étant donné un refus de Resend, alors l'erreur levée par `sendEmail` ne contient que le statut HTTP (`Resend answered 422`), jamais le corps de la réponse.
- Étant donné l'absence de `RESEND_API_KEY` :
  - si `NODE_ENV` vaut `development`, l'email (lien compris) est affiché dans le log comme aujourd'hui ;
  - pour toute autre valeur (`production`, `test`, `staging`, valeur absente), `sendEmail` lève `RESEND_API_KEY is not set` et n'écrit pas le lien.

## Hors périmètre

Ces points mineurs de la revue seront signalés dans un commentaire sur la PR #20, mais ne sont pas traités ici :
- timeout de `sendEmail` ;
- `EMAIL_FROM` absent hors production ;
- limite d'envoi par adresse destinataire ;
- valeurs `q` dans `emailLocale` ;
- animation du cœur jouée avant la confirmation du vote ;
- bouton de vote bloqué après une erreur réseau ;
- nom ou mot de passe fait uniquement d'espaces ;
- recherche qui ne replie pas `œ`, `æ`, `ß`, `ł` et `ø` ;
- limites de débit explicites sur `/send-verification-email` et `/request-password-reset` ;
- `segmented.tsx` absent ;
- CSP avec nonces.

Aucun autre changement de design, de texte ni de comportement de la PR #20.

## Cas limites et erreurs

- **Lien de vérification ouvert deux fois.** Better Auth redirige vers `callbackURL` même si l'adresse est déjà vérifiée (`better-auth/dist/api/routes/email-verification.mjs:278-283`), donc la page affiche « Adresse confirmée » sans erreur.
- **Lien de vérification invalide ou expiré.** C'est le comportement actuel de la PR (`auth.linkInvalid`), sans changement.
- **Renvoi du lien depuis « mon espace »** (`my-space.tsx:105`, `callbackURL: "/me"`, session ouverte avant la vérification obligatoire). Le comportement n'est pas modifié par cette branche ; il est à vérifier au test manuel.
- **Scénario d'attaque de CA1.** Un compte est créé d'avance par un tiers, puis la victime clique sur le lien. Elle n'a pas de session et doit passer par « Mot de passe oublié ». La réinitialisation ferme les sessions du tiers (`revokeSessionsOnPasswordReset: true`, `src/lib/auth.ts:70`).
- **Mots de passe de 127, 128 et 129 caractères.** Les deux premiers sont acceptés, le troisième refusé. La longueur est comptée en unités UTF-16 côté serveur (`password.length`) comme côté `maxLength`.
- **Collage d'un mot de passe de plus de 128 caractères dans un champ.** Le navigateur le tronque à cause de `maxLength` ; `passwordProblems` reste l'autorité pour l'affichage.
- **Panne de Have I Been Pwned pendant une inscription.** Code `PASSWORD_CHECK_UNAVAILABLE`, aucun compte créé.
- **Have I Been Pwned répond un corps illisible.** Le plugin lève une erreur (`haveibeenpwned/index.mjs:16`), qui est traitée comme une panne.
- **Corps de réponse de Resend contenant une adresse email.** Il n'apparaît dans aucun message d'erreur.
- **`NODE_ENV` absent.** Aucun lien n'est affiché, `sendEmail` lève une erreur.

## Contraintes techniques

- **Versions** (lues dans `node_modules/*/package.json`, conformes au lockfile) : `better-auth` 1.7.27, `next` 16.4.6. Le `AGENTS.md` du dépôt demande de lire `node_modules/next/dist/docs/` avant de toucher à une API de Next.
- **Plugin Have I Been Pwned** (`better-auth/dist/plugins/haveibeenpwned/index.mjs`) :
  - Options disponibles : `paths`, `enabled`, `customPasswordCompromisedMessage` (lignes 50-77). Aucune option ne permet de changer l'erreur en cas de panne.
  - En cas de panne, il lève `APIError("INTERNAL_SERVER_ERROR")` avec le message « Failed to check password… » (lignes 37 et 41), sans code dédié.
  - Le contrôle s'exécute à l'intérieur de `ctx.password.hash` (lignes 63-74).
  - `isPasswordCompromised` est exporté (ligne 80).
  - Pour CA2, l'implémentation doit soit envelopper ce `hash`, soit réutiliser `isPasswordCompromised` dans un plugin maison qui remplace l'officiel en gardant ses chemins par défaut. Le mécanisme exact (ordre des plugins, API des hooks) est non vérifié et doit être prouvé par un test.
- **Longueur maximale** : Better Auth l'applique avec 128 par défaut (`better-auth/dist/context/create-context.mjs:187`).
- **Lien de vérification** : il redirige vers `callbackURL` après vérification, avec ou sans connexion automatique (`email-verification.mjs:287-308`).
- **Sécurité** : ne jamais logger d'adresse email, de mot de passe, de jeton ni de corps de réponse d'un tiers. Pas de nouvelle variable d'environnement.
- **Dépendances** : aucune nouvelle.

## Impact sur l'architecture

- **Domaine** :
  - `src/lib/password.ts` : ajouter `MAX_PASSWORD_LENGTH` et le champ `tooLong` de `passwordProblems`.
  - `src/features/auth/errors.ts` : protéger la table contre le prototype (`Object.hasOwn` ou `Map`), ajouter `PASSWORD_TOO_LONG` et `PASSWORD_CHECK_UNAVAILABLE`.
- **Infrastructure** :
  - `src/lib/auth.ts` : `autoSignInAfterVerification: false`, `maxPasswordLength`, traitement de la panne de Have I Been Pwned.
  - `src/lib/email.ts` : message d'erreur réduit au statut, affichage du lien seulement en `development`.
- **Interface** :
  - formulaires `sign-up-form.tsx` et `reset-form.tsx` : `maxLength` et message `tooLong` ;
  - `sign-in-form.tsx` et sa page : bandeau `verified` et `callbackURL` partagé ;
  - dictionnaires `src/i18n/en.ts`, `fr.ts` et `mg.ts` : clés `auth.verified`, `auth.checkUnavailable` et `auth.tooLong`. Le malgache est à faire relire (voir `src/i18n/MG_REVIEW.md`).
- **Fichiers statiques** :
  - déplacer les 4 fichiers vers `public/gallery/` et supprimer `public/museum/` ;
  - mettre à jour `src/components/gallery/content.ts`, `Scene.tsx` (2 chemins) et `Overlays.tsx` ;
  - compléter `public/gallery/sources.json`.

## Plan de test

Tests automatisés (vitest), un par critère au minimum :

- **CA1** :
  - `auth.test.ts` construit la configuration et vérifie `options.emailVerification.autoSignInAfterVerification === false` ;
  - un test vérifie que la constante de `callbackURL` vaut `/sign-in?verified=1` et que les formulaires l'utilisent.
- **CA2** :
  - fetch de Have I Been Pwned simulé en échec (rejet réseau et réponse 503) : le hachage d'un mot de passe sur `/sign-up/email` lève une erreur de code `PASSWORD_CHECK_UNAVAILABLE` ;
  - réponse qui contient le suffixe du hachage : `PASSWORD_COMPROMISED` ;
  - `authErrorKey({ code: "PASSWORD_CHECK_UNAVAILABLE" })` renvoie `auth.checkUnavailable`.
- **CA3** :
  - `passwordProblems` avec 128 caractères donne `tooLong: false`, avec 129 caractères `tooLong: true` ;
  - `authErrorKey({ code: "PASSWORD_TOO_LONG" })` renvoie `auth.tooLong` ;
  - la configuration expose `maxPasswordLength === 128`.
- **CA4** : `authErrorKey` sur `constructor`, `__proto__`, `toString` et `hasOwnProperty` renvoie `auth.unexpected`, et les codes connus restent inchangés.
- **CA5** :
  - un test lit `public/gallery/sources.json` et vérifie que chaque entrée pointe vers un fichier existant et que les 4 fichiers déplacés y figurent ;
  - un test vérifie l'absence de `public/museum/` et de toute chaîne `"/museum/` dans `src/` en dehors de `src/app/**/artists/[id]/museum`.
- **CA6** :
  - Resend en 422 avec un corps qui contient `victim@example.test` : le message d'erreur vaut exactement `Resend answered 422` ;
  - sans clé : rien n'est affiché et aucune erreur n'est levée avec `NODE_ENV=development` ; une erreur est levée avec `test`, `staging` et une valeur absente.
- **Dictionnaires** : les clés ajoutées existent dans les trois langues (`locales.test.ts`).
- **Commandes** : `vitest run`, `eslint`, `tsc --noEmit` (après `next typegen`) et `next build` passent.

Vérifications manuelles (testeur-manuel) :

- inscription, clic sur le lien, arrivée sur la connexion avec « Adresse confirmée », puis connexion ;
- scénario du compte créé d'avance : lien cliqué sans session, réinitialisation, puis l'ancien mot de passe ne fonctionne plus ;
- galerie d'accueil : paysage 3D, Monet, son et waveform chargés, aucune 404 dans la console ;
- `/museum` renvoie 404 ;
- un mot de passe de 129 caractères est tronqué ou refusé avec le bon message.

## Choix par défaut retenus

- Panne de Have I Been Pwned : **on bloque avec un message clair** (choix de l'utilisateur, 2026-11-22).
- Après vérification, arrivée sur `/sign-in?verified=1` (le plus simple, car plus aucune session n'est ouverte).
- `landscape.glb` crédité « Source to be confirmed » : rien dans l'historique git (commits `65e7c49`, `fe95705`, `63dd778`) ne documente son origine.
- Les textes des crédits suivent le format anglais déjà utilisé dans `public/gallery/sources.json`.

## Questions ouvertes

- Origine et licence de `landscape.glb`, à demander à TsioryJonathan, auteur du commit `65e7c49`.
- Relecture des nouvelles traductions malgaches.
