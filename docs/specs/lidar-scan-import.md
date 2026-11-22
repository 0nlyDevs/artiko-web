# Spécification : import des scans LiDAR et rendu 3D des œuvres

- **Branche :** `feat/lidar-scan-import` (artiko-web), branche du même nom à créer dans artiko-api depuis `main` (ce dépôt n'a pas de `develop`).
- **Statut :** en attente de validation humaine.

## Objectif

Un artiste qui scanne son œuvre avec un iPhone Pro (Reality Composer) obtient un fichier `.usdz`, qu'Artiko refuse : l'API n'accepte que `.glb` (`artiko-api/app/platform/storage.py:28`). Les modèles 3D publiés sont ensuite affichés tels quels, en petit sur un socle du musée, sans vue détaillée, sans image d'attente et sans compression. Cette fonctionnalité convertit et optimise le scan dans le navigateur de l'artiste, stocke une image d'attente et deux variantes, et offre une vue détaillée de l'œuvre 3D aux visiteurs.

## Histoires utilisateur

- En tant qu'**artiste**, je veux publier directement le `.usdz` de mon scan, afin de montrer mon œuvre en 3D sans outil de conversion.
- En tant que **visiteur**, je veux examiner une œuvre 3D sous tous ses angles, avec une version détaillée à la demande, afin de l'apprécier comme en vrai, même sur mobile en 4G.

## Critères d'acceptation

### Import et optimisation (web, formulaire de publication)

- **CA1** Étant donné le formulaire de publication, quand l'artiste choisit un fichier `.usdz` valide, alors le navigateur le convertit en GLB, produit une variante 1K (textures ≤ 1024 px) et une variante 2K (textures ≤ 2048 px) compressées (Draco + WebP), une image d'attente WebP, et affiche un aperçu 3D du résultat avec la taille de chaque fichier, sans rien envoyer au serveur avant la validation du formulaire.
- **CA2** Étant donné un `.glb` choisi dans le formulaire, quand il est sélectionné, alors il passe par la même optimisation (sans conversion) et produit les mêmes trois fichiers.
- **CA3** Étant donné un scan optimisé, quand l'artiste publie, alors la requête `POST /works` envoie la variante 1K comme `file`, la variante 2K comme `model_hd` et l'image d'attente comme `poster` ; l'œuvre créée a `media_kind = "model"`, `media_url` (1K), `media_hd_url` (2K) et `poster_url` renseignés.
- **CA4** Étant donné un `.usdz` corrompu, sans maillage, ou qui référence un fichier hors de son archive, quand l'artiste le choisit, alors un message d'erreur explicite s'affiche, le bouton de publication reste désactivé et aucune requête n'est envoyée.
- **CA5** Étant donné une variante 1K ou 2K produite au-delà de la limite d'envoi (20 Mo, `artiko-api/app/platform/config.py:29`), quand l'optimisation se termine, alors le formulaire l'indique et refuse la publication.
- **CA6** Étant donné l'optimisation en cours, quand elle dure, alors une progression par étape s'affiche (conversion, optimisation 2K, optimisation 1K, image d'attente) et l'interface reste réactive (travail hors du fil principal quand c'est possible).

### API (artiko-api)

- **CA7** Étant donné `POST /works` avec un `file` GLB, quand `model_hd` (GLB) et `poster` (image JPEG, PNG ou WebP) sont joints, alors ils sont validés par leur contenu réel (signature `glTF`, image décodable), stockés sous leur empreinte SHA-256 comme les autres médias, et exposés dans `WorkOut.media_hd_url` et `WorkOut.poster_url`.
- **CA8** Étant donné `model_hd` ou `poster` joint à une œuvre dont `file` n'est pas un GLB, ou un `model_hd` qui n'est pas un GLB, ou un `poster` qui n'est pas une image, alors l'API répond 400 avec un code d'erreur explicite et ne stocke rien.
- **CA9** Étant donné une œuvre publiée sans `model_hd` ni `poster` (anciennes œuvres, autres clients de l’API), quand elle est lue, alors `media_hd_url` et `poster_url` valent `null` et rien d'autre ne change.

### Vue détaillée (web, musée de l'artiste)

- **CA10** Étant donné une œuvre 3D sélectionnée dans le musée, quand le panneau latéral s'affiche, alors il montre une vue 3D interactive de la variante 1K (rotation, zoom), l'image d'attente pendant le chargement, et des boutons de vue face, dos, gauche, droite, dessus.
- **CA11** Étant donné une œuvre avec `media_hd_url`, quand le visiteur active « HD », alors la variante 2K se charge ; si elle échoue ou si le contexte WebGL est perdu, la vue revient au 1K et le bouton HD disparaît.
- **CA12** Étant donné l'échec du chargement de la variante 1K, alors l'image d'attente reste affichée avec un bouton « Réessayer » qui relance réellement le téléchargement.
- **CA13** Étant donné un navigateur sans WebGL, alors le panneau affiche l'image d'attente (ou, sans image d'attente, un libellé « Œuvre 3D ») et un message court, sans télécharger de modèle.

### Musée allégé

- **CA14** Étant donné le musée 3D, quand une œuvre 3D est posée sur un socle, alors le socle charge `media_url` (1K) et le décodeur Draco est servi par artiko-web lui-même : aucune requête vers `www.gstatic.com` (défaut de drei 10.7.9, `core/Gltf.js:8`).
- **CA15** Étant donné le mode 2D du musée, alors une œuvre 3D avec `poster_url` montre son image d'attente comme vignette (aujourd'hui seules les images en ont une, `src/features/artist-museum/museum-view.tsx:56`).
- **CA16** Étant donné le chargement d'un socle, alors un repère visuel (image d'attente ou forme neutre) s'affiche à la place de `fallback={null}` (`src/features/artist-museum/museum-3d.tsx:43`).

## Hors périmètre

- L'app Android, abandonnée par l'équipe (décision du 2026-11-22) : aucune évolution, ni capture ni affichage 3D.
- Réalité augmentée (AR Quick Look avec l'USDZ d'origine) : l'USDZ n'est pas conservé.
- Conversion ou optimisation côté serveur.
- Retraitement des œuvres 3D déjà publiées.
- Détection de copie des modèles 3D (seules les images passent par CLIP et pHash, `artiko-api/app/features/works/service.py:57-58`) ; la détection de doublon exact par SHA-256 s'applique au fichier 1K.
- Scan sans iPhone (Polycam, photogrammétrie) : tout `.glb` passe par CA2, sans garantie de rendu.

## Cas limites et erreurs

| Cas | Comportement attendu |
|---|---|
| Fichier `.usdz` vide, tronqué ou pas une archive ZIP | Erreur « Fichier USDZ illisible », publication bloquée (CA4) |
| USDZ sans maillage | Erreur « Aucun objet 3D dans ce fichier » (CA4) |
| USDZ avec référence à un fichier externe | Erreur explicite, aucune requête réseau sortante pendant la conversion (CA4) |
| USDZ très gros (au-delà de 150 Mo) | Refusé avant conversion avec un message de taille, pour ne pas épuiser la mémoire du navigateur |
| Textures non décodées au moment de l'export | La conversion attend leur décodage (`image.width > 0`) avant d'exporter, comme dans le spike ; sinon le GLB perdrait ses textures |
| Texture uniforme (ex. occlusion blanche) | Peut être retirée par l'optimisation, sans effet visuel |
| Variante 2K identique ou plus petite que 1K (textures déjà ≤ 1024 px) | Les deux variantes sont publiées telles quelles |
| Variante au-delà de 20 Mo | Publication refusée côté navigateur (CA5) et côté API (413 existant) |
| Même scan publié deux fois | 409 `duplicate_work` sur l'empreinte du 1K, déjà géré par l'API. Fiable seulement si l'optimisation donne un résultat identique à chaque fois (à vérifier pendant la preuve technique) ; sinon le doublon n'est pas détecté, comme aujourd'hui pour un `.glb` réexporté |
| Navigateur sans WebAssembly ou sans Web Worker | Message « Navigateur non compatible pour l'import 3D » ; l'artiste peut toujours publier une image, un son ou une vidéo |
| Onglet fermé pendant l'optimisation | Rien n'est envoyé ; rien à nettoyer côté serveur |
| `poster` ou `model_hd` sans `file` GLB | 400 (CA8) |
| Échec du chargement HD, perte du contexte WebGL | Retour au 1K (CA11) |
| Échec réseau sur le 1K | Image d'attente + Réessayer (CA12) |

## Contraintes techniques

### Versions vérifiées

| Élément | Version | Source |
|---|---|---|
| Next.js | 16.4.6 | `artiko-web/package.json`, `pnpm-lock.yaml` ; AGENTS.md impose de lire `node_modules/next/dist/docs/` avant de coder |
| React | 19.3.0 | `pnpm-lock.yaml` |
| three | 0.187.0 | `pnpm-lock.yaml` ; l'archive npm contient `examples/jsm/loaders/USDLoader.js`, `exporters/GLTFExporter.js`, `libs/draco/gltf/draco_decoder.wasm`, `libs/fflate.module.js` (vérifié) |
| @react-three/drei | 10.7.9 | `pnpm-lock.yaml` ; décodeur Draco par défaut sur gstatic 1.5.5, modifiable par `useGLTF.setDecoderPath` (`core/Gltf.js:8,29`) |
| @google/model-viewer | 4.4.0 | `pnpm-lock.yaml`, résolu avec three 0.187.0 alors que son pair déclaré est `^0.183.0` (spike devfest) : compatibilité à vérifier au début du développement |
| @gltf-transform/core, functions, extensions | 4.5.1 (dernière 4.x) | `npm view` ; **nouvelle dépendance à valider** |
| draco3d (encodeur WebAssembly) | 1.5.9 | `npm view` ; **nouvelle dépendance à valider** |
| API : Python 3.14, FastAPI, SQLAlchemy, Alembic | — | `artiko-api/Dockerfile:1`, `pyproject.toml` ; Python 3.14 associe `.glb` à `model/gltf-binary` (vérifié), donc `/media` sert le bon type |

### Faits repris du spike devfest (même chaîne, three 0.183.2, Chrome headless)

- Conversion USDLoader → GLTFExporter : 0,96 s pour un scan iPhone 13 Pro de 4,9 Mo, 6,0 s pour l'échantillon Apple de 31,2 Mo.
- Optimisation Draco + WebP : scan réel 148 Ko en 2K et 74 Ko en 1K ; échantillon Apple 2,98 Mo en 2K et 1,29 Mo en 1K.
- Ces mesures viennent de l'outil CLI de glTF-Transform sous Node. **Non vérifié :** que les mêmes fonctions (`draco`, `textureCompress`, `resample`, `prune`) tournent dans le navigateur avec l'encodeur `draco3d` et un encodage WebP par canvas, et avec quelle durée. C'est la première tâche du développement (preuve technique) ; si elle échoue, la spec revient en validation.

### Sécurité

- Le scan est un fichier de l'artiste lu dans son propre navigateur ; aucune requête réseau pendant la conversion (les références externes font échouer la conversion, CA4).
- L'API reste l'autorité : chaque fichier est validé par son contenu (`storage.kind_of`, signature `glTF`, image décodable), avec les limites de taille existantes.
- L'USDZ d'origine n'est ni envoyé ni stocké : il contient l'application de capture, un chemin local de l'appareil et des horodatages (constaté sur le scan devfest). Le GLB exporté ne les contient pas (constaté).
- Décodeur Draco servi par artiko-web (CA14), pour ne pas exposer les visiteurs à un tiers.

### Performance

- Musée et vue détaillée chargent le 1K par défaut ; le 2K seulement à la demande (CA11).
- L'optimisation tourne dans un Web Worker si les bibliothèques le permettent (à confirmer pendant la preuve technique).

## Impact sur l'architecture

### artiko-api

- **Domaine / modèle :** `Work` gagne `media_hd_path` et `poster_path` (texte, nullables) — `app/features/works/models.py`. Migration Alembic `0014_work_model_variants.py`.
- **Application :** `publish_work` (`app/features/works/service.py`) accepte `model_hd` et `poster` optionnels, les valide (CA7, CA8) et les stocke avec `storage.save`.
- **Interface :** `POST /works` reçoit deux champs `File()` optionnels (`app/features/works/router.py:61-73`) ; `WorkOut` gagne `media_hd_url` et `poster_url` (`app/features/works/schemas.py:47`) ; `openapi.yml` mis à jour.
- Aucune nouvelle dépendance.

### artiko-web

- **Nouvelle fonctionnalité** `src/features/model-import/` : lecture du fichier, conversion USDZ → GLB, optimisation 1K et 2K, image d'attente, dans un Web Worker ; aperçu. Interfaces injectables (convertisseur, optimiseur, générateur d'image) pour tester sans navigateur réel.
- **Formulaire** `src/features/artist-space/publish-form.tsx` : accepte `.usdz`, affiche progression, aperçu et tailles, envoie `file`, `model_hd`, `poster`.
- **Vue détaillée** `src/features/model-viewer/` : composant `ArtworkViewer` adapté de devfest (model-viewer, vues préréglées, HD, image d'attente, Réessayer, repli WebGL), utilisé par `museum-view.tsx`.
- **Musée** `museum-3d.tsx` et `museum-view.tsx` : socle 1K, repère pendant le chargement, vignette en mode 2D.
- **Infrastructure** : copie des fichiers du décodeur Draco de three dans `public/draco/` à l'installation ou au build, `useGLTF.setDecoderPath` et `dracoDecoderLocation` de model-viewer pointés dessus.
- **Client API** : `pnpm api:generate` depuis le nouveau `openapi.yml`.
- **Nouvelles dépendances (validées par l'utilisateur le 2026-11-22) :** `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions` 4.5.1, `draco3d` 1.5.9.

### artiko-mobile

- Hors périmètre : l'app est abandonnée.

## Plan de test

### Automatisés

| Critère | Test |
|---|---|
| CA1, CA2 | Vitest : orchestration de l'import avec faux convertisseur, optimiseur et générateur d'image (ordre des étapes, trois fichiers produits) ; test d'intégration en navigateur réel (Playwright, Chrome) sur un USDZ minimal généré dans le test (cube texturé) |
| CA3 | Vitest : le formulaire envoie `file` 1K, `model_hd` 2K et `poster` |
| CA4 | Intégration navigateur : USDZ tronqué, sans maillage, avec référence externe → message, aucune requête envoyée |
| CA5 | Vitest : variante de plus de 20 Mo → publication refusée |
| CA6 | Vitest : progression affichée pour chaque étape |
| CA7, CA8, CA9 | pytest (artiko-api) : publication avec variantes et image d'attente ; 400 pour chaque combinaison invalide ; ancienne œuvre → champs `null` ; migration appliquée sur la base de test |
| CA10 à CA13 | Vitest + Testing Library : boutons de vue, bascule HD, retour au 1K, Réessayer (URL rechargée), repli sans WebGL |
| CA14 | Test de configuration : chemin du décodeur Draco local ; vérification navigateur : aucune requête vers `gstatic.com` |
| CA15, CA16 | Vitest : vignette en mode 2D, repère pendant le chargement |

### Manuels

1. Publier le scan du chargeur (`~/scans/chargeur.usdz`) et un scan d'œuvre réel depuis Chrome sur ordinateur ; noter la durée de l'optimisation et les tailles produites.
2. Publier depuis Safari sur iPhone (le fichier vient directement de Reality Composer).
3. Ouvrir le musée et la vue détaillée dans le navigateur d'un téléphone Android et d'un iPhone en 4G : chargement, rotation, HD, image d'attente.
4. Vérifier dans l'onglet réseau : aucune requête hors d'Artiko.

## Choix par défaut retenus

- **Optimisation dans le navigateur** (choix de l'utilisateur), aucune dépendance ajoutée à l'API.
- La variante 1K devient le fichier principal (`file`, `media_url`) : le musée et tout client qui ne connaît pas les nouveaux champs obtiennent automatiquement le fichier léger.
- Textures en WebP, 1K à 1024 px et 2K à 2048 px, géométrie Draco : réglages validés par le spike devfest.
- Image d'attente WebP générée depuis la vue de face par défaut du modèle 1K.
- Taille maximale d'un USDZ accepté par le navigateur : 150 Mo (l'échantillon Apple de 31,2 Mo passe largement).
- L'USDZ d'origine n'est pas conservé (métadonnées de l'appareil, pas d'AR dans ce périmètre).
- Vue du dessous non proposée, car le dessous n'est souvent pas scanné ; orbite verticale limitée à l'horizon.
- Textes d'interface en français, anglais et malgache, dans les fichiers `src/i18n/` existants.

## Questions ouvertes

1. **Déterminisme** : le même scan optimisé deux fois donne-t-il exactement le même fichier dans le navigateur ? C'est vérifié pendant la preuve technique et noté dans la PR ; aucun travail supplémentaire n'est prévu si ce n'est pas le cas.
2. **Œuvres 3D existantes** : pas de retraitement dans ce lot.
