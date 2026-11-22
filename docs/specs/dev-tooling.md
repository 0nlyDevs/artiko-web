# Spec : outillage de développement (Taskfile, mise, gitleaks, CI)

Branche : `chore/dev-tooling` (depuis `develop`) · Dépôt : artiko-web · Rédigée le 2026-11-22

## Objectif

Aujourd'hui, builder le front demande d'avoir la bonne version de Node et de pnpm puis d'enchaîner cinq commandes à la main (`.github/workflows/ci.yml:16-20`). Les versions ne sont épinglées nulle part côté poste (la CI met Node 24 en dur, `ci.yml:14`, un poste peut avoir Node 26) et aucun contrôle n'empêche un secret d'entrer dans l'historique. On veut un seul point d'entrée (`task build`), des outils épinglés par `mise.toml`, et une détection de secrets en local et en CI.

## Histoire utilisateur

En tant que développeur ou développeuse qui rejoint artiko-web, je veux installer les outils et builder le front avec deux commandes (`mise install`, `task build`), et être bloqué avant de committer ou de fusionner un secret, afin d'avoir le même résultat que la CI sans configuration manuelle ni fuite de credentials.

## Critères d'acceptation

- **CA1 — Outils épinglés.** Étant donné un poste avec mise installé et le dépôt cloné, quand je lance `mise install` à la racine, alors Node, pnpm, Task et gitleaks sont installés aux versions exactes de `mise.toml`, et `node -v`, `pnpm -v`, `task --version`, `gitleaks version` les affichent.
- **CA2 — Cohérence pnpm.** Étant donné `mise.toml`, quand je compare sa version de pnpm à `packageManager` de `package.json` (`pnpm@10.16.0`, `package.json:44`), alors elles sont identiques ; une tâche `task check:versions` échoue si elles divergent.
- **CA3 — Build en une commande.** Étant donné un clone propre sans `node_modules`, quand je lance `task build`, alors les dépendances sont installées (`pnpm install --frozen-lockfile`) puis `next build` s'exécute, et la commande sort avec le code 0.
- **CA4 — Build incrémental.** Étant donné un `task build` réussi et aucune modification de `pnpm-lock.yaml`, quand je relance `task build`, alors l'étape d'installation est sautée (Task la marque à jour) et seul le build tourne.
- **CA5 — Échec propagé.** Étant donné une erreur de type ou de lint introduite volontairement, quand je lance `task ci`, alors la tâche s'arrête à la première étape en échec avec un code de sortie non nul.
- **CA6 — Pipeline local = CI.** Étant donné le Taskfile, quand je lance `task ci`, alors s'exécutent dans l'ordre : install, audit (`pnpm audit --prod --audit-level high`), lint, typecheck, test, build — les mêmes étapes que la CI.
- **CA7 — Typecheck explicite.** Étant donné une erreur de type dans un fichier `.ts` non importé par une page, quand je lance `pnpm typecheck` (ou `task typecheck`), alors `tsc --noEmit` échoue et la signale.
- **CA8 — Gitleaks en CI.** Étant donné une PR qui ajoute un secret factice détectable (ex. clé AWS de test), quand la CI tourne, alors le job `gitleaks` échoue et la PR est bloquée ; sans secret, le job passe.
- **CA9 — Plage scannée.** Étant donné un checkout `fetch-depth: 0`, quand le job gitleaks tourne sur une PR, alors il scanne exactement les commits `base.sha..head.sha` de la PR ; sur un push vers `main` ou `develop`, il scanne tout l'historique (`--all`). Le binaire téléchargé est vérifié par SHA-256 avant exécution ; une somme différente fait échouer le job.
- **CA10 — Hook pre-commit.** Étant donné `task hooks:install` lancé une fois, quand je tente de committer un fichier contenant un secret factice, alors le commit est refusé avec le rapport gitleaks (fichier, ligne, règle) ; sans secret, le commit passe sans délai notable.
- **CA11 — CI durcie.** Étant donné le workflow, alors il déclare `permissions: contents: read` au niveau du workflow (le job gitleaks reçoit en plus uniquement ce dont il a besoin), un bloc `concurrency` qui annule les runs obsolètes d'une même PR, et lit les versions d'outils depuis `mise.toml` (plus de `node-version: 24` en dur).
- **CA12 — Documentation.** Étant donné le README, alors la section « Develop » décrit `mise install`, `task --list`, `task build`, `task ci`, `task hooks:install`.
- **CA13 — Gitleaks obligatoire vers develop.** Étant donné la règle de protection de `develop`, quand une PR vise `develop` et que le job `gitleaks` est rouge ou n'a pas tourné, alors le bouton de merge est bloqué ; quand le job est vert (avec les autres checks), le merge est possible. La règle est posée après le merge de cette branche (réglage GitHub, appliqué par `git-github` sur accord explicite), avec `gitleaks` comme check de statut requis.

## Hors périmètre

- Déploiement (Vercel) et toute tâche de release.
- Monorepo ou Taskfile commun aux trois dépôts (api, mobile) : seul artiko-web est concerné.
- Fusion des PR Dependabot ouvertes (checkout, setup-node, pnpm/action-setup) : traitées à part.
- Génération du client API (`pnpm api:generate`) dans `task build` : elle dépend du dépôt voisin artiko-api ; elle reste une tâche séparée `task api:generate`.
- Réécriture de l'historique git : le scan actuel ne trouve aucune fuite (voir Contraintes).

## Cas limites et erreurs

| Situation | Comportement attendu |
|---|---|
| mise absent du poste | `task` absent aussi ; le README indique l'installation de mise en prérequis. Pas de fallback silencieux. |
| Task lancé hors de mise (Node système différent) | `task check:versions` (dépendance de `build` et `ci`) échoue avec un message qui donne la version attendue et la commande `mise install`. |
| `pnpm-lock.yaml` désynchronisé de `package.json` | `pnpm install --frozen-lockfile` échoue, `task build` s'arrête (code non nul). |
| Build lancé sans `.env.local` | Doit passer : `next build` ne requiert pas `BETTER_AUTH_SECRET` (README.md:19). Aucune tâche ne lit ni n'affiche `.env*`. |
| Faux positif gitleaks (ex. hash, URL d'exemple de `.env.example`) | Ajout ciblé dans `.gitleaks.toml` (allowlist par chemin ou regex) ou empreinte dans `.gitleaksignore`, jamais désactivation globale. |
| Téléchargement du binaire en échec (réseau, release retirée) | `curl --fail --retry 3` puis échec du job ; jamais de `continue-on-error`. |
| Somme SHA-256 du binaire différente | `sha256sum --check` échoue, le binaire n'est pas exécuté, le job est rouge. |
| Commit de base d'une PR absent du clone | `git cat-file -e` échoue explicitement au lieu de scanner une plage vide. |
| Hook pre-commit et `git commit --no-verify` | Contournement possible localement ; la CI reste le garde-fou obligatoire. |
| PR venant d'un fork | Le scan n'a besoin d'aucun secret : il tourne normalement. |
| Hook déjà présent dans `.git/hooks/pre-commit` | `task hooks:install` refuse d'écraser un hook différent et l'indique (actuellement aucun hook, vérifié : `ls .git/hooks`). |
| Worktrees git | Le hook est installé via `core.hooksPath` versionné (`.githooks/`), donc partagé par tous les worktrees. |

## Contraintes techniques

- **Stack** : Next.js 16.4.6, React 19.3.0, TypeScript 5.9.3, vitest 4, eslint 9 (`package.json`, `pnpm-lock.yaml:2988`), pnpm 10.16.0 (`package.json:44`).
- **Node** : CI en 24 (`ci.yml:14`). On épingle Node 24 dans `mise.toml` (version exacte, la plus récente 24.x au moment du dev, à lire via `mise ls-remote node 24`).
- **Task** : go-task v3.54.0, dernière stable (https://github.com/go-task/task/releases, lu le 2026-11-22). Schéma `version: '3'`, `sources`/`generates`/`preconditions` : syntaxe à vérifier sur https://taskfile.dev/docs/reference/schema pendant le dev (non vérifié à ce stade).
- **gitleaks** : v8.30.1, dernière stable (https://github.com/gitleaks/gitleaks/releases). Scan local de l'historique actuel : `gitleaks git` → 77 commits, « no leaks found » (exécuté le 2026-11-22).
- **gitleaks en CI, sans gitleaks-action** : gitleaks-action exige une licence `GITLEAKS_LICENSE` pour les dépôts d'organisation (https://github.com/gitleaks/gitleaks-action), et ce dépôt appartient à l'organisation `artiko-songomby-d1` (`gh api` → `Organization`). On reprend donc le motif déjà utilisé par l'équipe (`devfest2026-worktrees/fe-handover/.github/workflows/ci.yml:23-70`) : téléchargement de l'archive de release officielle `gitleaks_8.30.1_linux_x64.tar.gz`, vérification SHA-256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` (identique au `gitleaks_8.30.1_checksums.txt` officiel, vérifié le 2026-11-22), puis `gitleaks git --no-banner --redact=100 --verbose --log-opts=<plage>`. Checkout avec `persist-credentials: false`. Aucune licence ni secret requis.
- **mise-action** : `jdx/mise-action@v5` (https://github.com/jdx/mise-action) ; installe les outils de `mise.toml`, cache activé par défaut. Noms d'outils dans le registre mise (`task`, `gitleaks`, `pnpm`) : non vérifié, à confirmer via `mise registry` pendant le dev.
- **`next build` et le typage** : je n'ai pas pu vérifier si Next 16 vérifie les types pendant le build (la doc `node_modules/next/dist/docs/` n'est pas installée sur le poste). Le `tsc --noEmit` explicite couvre aussi les fichiers hors graphe des pages et les tests, donc il reste utile dans les deux cas.
- **Sécurité** : aucune tâche ne lit ni n'affiche `.env*` ; le rapport gitleaks est en mode `--redact` en local et en CI pour ne pas réimprimer le secret dans les logs ; aucune nouvelle dépendance npm (le hook est un script shell, pas husky/lefthook).

## Impact sur l'architecture

Pas de changement dans les couches domaine, application ou interface : uniquement l'outillage (infrastructure de dev et CI).

| Fichier | Changement |
|---|---|
| `mise.toml` (nouveau) | `[tools]` : node, pnpm, task, gitleaks aux versions exactes. |
| `Taskfile.yml` (nouveau) | Tâches `install`, `check:versions`, `lint`, `typecheck`, `test`, `audit`, `build`, `ci`, `dev`, `api:generate`, `secrets:scan`, `hooks:install`. |
| `.githooks/pre-commit` (nouveau) | `gitleaks git --pre-commit --staged --redact`. |
| `.gitleaks.toml` (nouveau, seulement si un faux positif apparaît) | Étend la config par défaut, allowlist ciblée. |
| `package.json` | Script `typecheck: tsc --noEmit`. |
| `.github/workflows/ci.yml` | `permissions`, `concurrency`, mise-action à la place de setup-node/pnpm-action, étape typecheck, appel de `task ci` ; nouveau job `gitleaks` (binaire de release vérifié par SHA-256, version et somme en variables `env`) ; `push` étendu à `develop`. |
| `.gitignore` | Rien a priori (mise et Task n'écrivent pas dans le dépôt hormis `.task/`, à ignorer). |
| `README.md` | Section « Develop » réécrite. |

Nouvelles dépendances (outils de poste et actions CI, pas de paquet npm) : mise, Task, gitleaks, `jdx/mise-action@v5` (gitleaks en CI : binaire de release officiel vérifié par SHA-256, pas d'action tierce). Validées par la demande initiale.

## Plan de test

Automatisé ou scripté :
- CA1 → dans un conteneur propre (ou la CI) : `mise install && node -v && pnpm -v && task --version && gitleaks version`, comparaison aux valeurs de `mise.toml`.
- CA2 → `task check:versions` passe ; modifier temporairement `packageManager` → échec attendu.
- CA3 → `git clean -xfd` dans un worktree jetable puis `task build`, code 0.
- CA4 → relancer `task build`, la sortie indique que `install` est à jour.
- CA5/CA7 → ajouter `const x: number = "a"` dans un fichier isolé → `task typecheck` et `task ci` échouent ; retirer.
- CA6 → `task --dry ci` liste les étapes dans l'ordre attendu.
- CA8/CA9 → PR de test jetable avec un faux jeton (`ghp_` + 36 caractères aléatoires ; la clé d'exemple AWS est ignorée par les règles par défaut) → job rouge. Un commit de retrait laisse le job rouge, car la plage `base..head` contient toujours le commit fautif : la PR de test est fermée sans merge et sa branche supprimée.
- CA10 → `task hooks:install`, puis commit d'un fichier avec un faux secret → refusé ; commit normal → accepté.
- CA11 → lecture du workflow + run CI vert ; deux pushes rapprochés sur la PR → le premier run est annulé.

Manuel :
- Suivre le README depuis zéro sur un poste (ou conteneur) sans Node ni pnpm.
- Vérifier que les logs CI de gitleaks ne contiennent pas la valeur du faux secret (redaction).

## Choix par défaut retenus

- Fichiers `Taskfile.yml` et `mise.toml` à la racine ; Task installé par mise (pas de binaire séparé).
- Node 24 (aligné sur la CI actuelle), pas 26.
- CI : un job `build` qui lance `task ci` et un job `gitleaks` séparé, en parallèle.
- Hook via `core.hooksPath=.githooks` (versionné, sans dépendance npm), installé par une tâche explicite plutôt qu'automatiquement au `pnpm install`.
- Scan gitleaks en CI sur `pull_request` (toute PR, dont celles vers `develop`) et `push` (`main`, `develop`), sans `schedule` quotidien.
- gitleaks en CI : motif de l'équipe (binaire de release + SHA-256), pas gitleaks-action, pour éviter la licence d'organisation.
- `develop` créée depuis `main` (`6535946`) et poussée sur origin le 2026-11-22.
- Protection de branche (réponse utilisateur) : `gitleaks` est un check requis pour toute PR vers `develop` (CA13). `main` n'est pas concerné par cette spec.
- Cache du store pnpm en CI conservé (via `actions/cache` sur le chemin `pnpm store path`, clé = hash du lockfile), puisqu'on retire `setup-node` qui le fournissait.

## Questions ouvertes

Aucune.
