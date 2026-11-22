import { artworkImages, objectModels } from '../../media/media';
import type {
  Item,
  ItemMedia,
  ItemVerification,
  Medium,
  ProvenanceRecord,
} from '../types';
import type { MockAccount, MockState } from './storage';

/*
 * Demo content of the mock adapter. Published works mirror data/rooms.ts so
 * the item page links back into the museum. Submissions illustrate the review
 * states. Everything is labelled as demonstration content in the interface.
 */

export const DEMO_PASSWORD = 'kanto-demo-2026';

export const demoAccounts: readonly MockAccount[] = [
  {
    accountId: 'acc-contributor',
    email: 'visiteur@kanto.demo',
    displayName: 'Rasoa Haingo',
    permissions: [],
    password: DEMO_PASSWORD,
  },
  {
    accountId: 'acc-reviewer',
    email: 'relecture@kanto.demo',
    displayName: 'Équipe de conservation',
    permissions: ['reviewer', 'admin'],
    password: DEMO_PASSWORD,
  },
  {
    accountId: 'acc-atelier',
    email: 'atelier@kanto.demo',
    displayName: 'Atelier Soa',
    permissions: [],
    password: DEMO_PASSWORD,
  },
];

const NO_VERIFICATION: ItemVerification = {
  status: 'not_started',
  startedAt: null,
  completedAt: null,
  signals: [],
};

const PROVENANCE_SCOPE =
  'Le certificat atteste un événement numérique lié à cette fiche : son dépôt, sa relecture et sa publication. Il n’établit ni l’authenticité physique de l’objet ni la propriété intellectuelle.';

const NO_PROVENANCE: ProvenanceRecord = {
  status: 'none',
  chain: null,
  token: null,
  transaction: null,
  requestedAt: null,
  mintedAt: null,
  explorerUrl: null,
  scope: PROVENANCE_SCOPE,
  simulated: true,
  failureMessage: null,
};

export const provenanceScope = PROVENANCE_SCOPE;

function image(
  id: string,
  name: string,
  url: string,
  size: { width: number; height: number } | null,
): ItemMedia {
  return {
    id,
    kind: 'image',
    name,
    url,
    bytes: 0,
    primary: true,
    status: 'ready',
    progress: 1,
    width: size?.width ?? null,
    height: size?.height ?? null,
    persistent: true,
  };
}

interface PublishedDraft {
  id: string;
  depositNumber: string;
  title: string;
  author: string;
  medium: Medium;
  room: { slug: string; number: string };
  period: string;
  place: string;
  technique: string;
  dimensions: string;
  region: string;
  summary: string;
  story: string;
  rightsHolder: string;
  media: ItemMedia[];
  model: { model1k: string; poster: string } | null;
  createdAt: string;
}

function published(draft: PublishedDraft): Item {
  const reviewedAt = draft.createdAt;
  return {
    id: draft.id,
    depositNumber: draft.depositNumber,
    ownerId: 'acc-reviewer',
    title: draft.title,
    author: draft.author,
    medium: draft.medium,
    details: {
      period: draft.period,
      place: draft.place,
      technique: draft.technique,
      dimensions: draft.dimensions,
      region: draft.region,
      summary: draft.summary,
      story: draft.story,
    },
    media: draft.media,
    model3d:
      draft.model === null
        ? { contentId: draft.id, status: 'missing', variants: null }
        : {
            contentId: draft.id,
            status: 'ready',
            variants: {
              poster: draft.model.poster,
              glb1k: draft.model.model1k,
              glb2k: null,
            },
          },
    rights: {
      relationship: 'holder',
      holder: draft.rightsHolder,
      consentShare: true,
      consentDisplay: true,
    },
    publication: 'published',
    review: {
      state: 'approved',
      itemClaims: 'verified',
      descriptionClaims: 'unreviewed',
      rationale:
        'Sources publiques vérifiées pour l’œuvre. La description reste à relire.',
      reviewerName: 'Équipe de conservation',
      requestedChanges: null,
      updatedAt: reviewedAt,
    },
    verification: NO_VERIFICATION,
    provenance: NO_PROVENANCE,
    isDemo: true,
    room: draft.room,
    createdAt: draft.createdAt,
    updatedAt: reviewedAt,
    history: [
      {
        id: `${draft.id}-h1`,
        at: draft.createdAt,
        actor: 'admin',
        label: 'Fiche créée depuis les sources publiques',
        detail: null,
      },
      {
        id: `${draft.id}-h2`,
        at: reviewedAt,
        actor: 'reviewer',
        label: 'Relecture : œuvre vérifiée, description non relue',
        detail: null,
      },
      {
        id: `${draft.id}-h3`,
        at: reviewedAt,
        actor: 'system',
        label: 'Publiée dans le musée',
        detail: null,
      },
    ],
  };
}

const T0 = '2026-11-20T09:00:00.000Z';

export function publishedItems(): Item[] {
  return [
    published({
      id: 'peinture-01',
      depositNumber: 'KT-2026-0101',
      title: 'Femme malgache',
      author: 'Antonio Zeno Shindler',
      medium: 'painting',
      room: { slug: 'peinture', number: '01' },
      period: 'vers 1893',
      place: 'Madagascar, lieu non précisé',
      technique: 'Huile sur toile',
      dimensions: '106,8 × 71,1 cm',
      region: 'Madagascar',
      summary:
        'Une femme debout, drapée dans un lamba rayé, devant des maisons.',
      story:
        'Le titre d’origine est « Malagasy Woman ». Antonio Zeno Shindler (1813–1899) a peint des portraits de peuples du monde pour la Smithsonian Institution.',
      rightsHolder:
        'Domaine public. Image du Smithsonian Open Access, licence CC0.',
      media: [
        image(
          'peinture-01-m1',
          'shindler-malagasy-woman.webp',
          artworkImages.malagasyWoman.src,
          artworkImages.malagasyWoman,
        ),
      ],
      model: null,
      createdAt: T0,
    }),
    published({
      id: 'peinture-02',
      depositNumber: 'KT-2026-0102',
      title: 'Antongona',
      author: 'Anonyme, monogramme « W.J. »',
      medium: 'painting',
      room: { slug: 'peinture', number: '02' },
      period: '1875',
      place: 'Antongona, Imerina',
      technique: 'Encre, aquarelle et gouache sur papier',
      dimensions: '23,5 × 34,3 cm',
      region: 'Imerina, Hautes Terres',
      summary:
        'Une colline de granit de l’Imerina, ses maisons et ses terrasses.',
      story:
        'Antongona est l’un des anciens sites fortifiés des collines qui entourent Antananarivo. Inscription au dos : « Edward Birchall Esq, Leeds ».',
      rightsHolder: 'Domaine public, reproduction via Wikimedia Commons.',
      media: [
        image(
          'peinture-02-m1',
          'anonymous-antongona.webp',
          artworkImages.antongona.src,
          artworkImages.antongona,
        ),
      ],
      model: null,
      createdAt: T0,
    }),
    published({
      id: 'peinture-03',
      depositNumber: 'KT-2026-0103',
      title: 'Pont d’Ambaniala',
      author: 'William Ellis',
      medium: 'painting',
      room: { slug: 'peinture', number: '03' },
      period: '1838',
      place: 'Ambaniala, Imerina',
      technique: 'Lithographie',
      dimensions: 'Non renseignées',
      region: 'Imerina, Hautes Terres',
      summary:
        'Une chaussée traverse les rizières, avec des zébus et les collines à l’horizon.',
      story:
        'Planche de « History of Madagascar », volume 2, Londres, 1838. William Ellis (1794–1872), missionnaire et auteur, a publié cette vue dans son histoire de Madagascar.',
      rightsHolder: 'Domaine public, reproduction via Wikimedia Commons.',
      media: [
        image(
          'peinture-03-m1',
          'ellis-bridge-at-ambaniala.webp',
          artworkImages.bridgeAtAmbaniala.src,
          artworkImages.bridgeAtAmbaniala,
        ),
      ],
      model: null,
      createdAt: T0,
    }),
    published({
      id: 'peinture-04',
      depositNumber: 'KT-2026-0104',
      title: 'Scène de divination par le sikidy, Tananarive',
      author: 'Henri Ratovo',
      medium: 'painting',
      room: { slug: 'peinture', number: '04' },
      period: '1912',
      place: 'Antananarivo',
      technique: 'Peinture, technique non confirmée',
      dimensions: 'Non renseignées',
      region: 'Antananarivo, Hautes Terres',
      summary:
        'Un intérieur aux murs de terre rouge où des personnes en lamba assistent à une séance de sikidy.',
      story:
        'Reproduction issue d’un catalogue de vente. Détenteur actuel non confirmé. La date de décès de l’auteur reste à vérifier.',
      rightsHolder: 'Domaine public à Madagascar (loi n° 94-036), à confirmer.',
      media: [
        image(
          'peinture-04-m1',
          'ratovo-sikidy-tananarive.webp',
          artworkImages.sikidy.src,
          artworkImages.sikidy,
        ),
      ],
      model: null,
      createdAt: T0,
    }),
    published({
      id: 'sculpture-01',
      depositNumber: 'KT-2026-0105',
      title: 'Pot en terre cuite vernissée',
      author: 'Modèle 3D : Aron Łyczek (Poly Haven)',
      medium: 'sculpture',
      room: { slug: 'sculpture', number: '01' },
      period: 'Objet non daté, numérisation 2026',
      place: 'Objet d’étude, hors collection',
      technique: 'Numérisation 3D d’un objet en céramique',
      dimensions: '65,6 × 50,2 × 37,2 cm',
      region: 'Hors collection',
      summary:
        'Objet de démonstration qui règle la visionneuse 3D en attendant les numérisations de la collection.',
      story:
        'Les aloalo et les figures du Sud seront présentés de la même façon, à faire tourner pour en découvrir chaque face.',
      rightsHolder:
        'Modèle CC0, Poly Haven. Il ne s’agit pas d’une œuvre malgache.',
      media: [
        image('sculpture-01-m1', 'poster.png', objectModels.ceramicPot.poster, {
          width: 1024,
          height: 1024,
        }),
      ],
      model: objectModels.ceramicPot,
      createdAt: T0,
    }),
    published({
      id: 'sculpture-02',
      depositNumber: 'KT-2026-0106',
      title: 'Vase ancien en céramique à décor peint',
      author: 'Modèle 3D : James Ray Cock (Poly Haven)',
      medium: 'sculpture',
      room: { slug: 'sculpture', number: '02' },
      period: 'Objet non daté, numérisation 2021',
      place: 'Objet d’étude, hors collection',
      technique: 'Numérisation 3D d’un objet en céramique',
      dimensions: '25,5 × 25,5 × 44 cm',
      region: 'Hors collection',
      summary:
        'Un vase à décor peint dont la panse et le col montrent comment la lumière révèle un volume.',
      story: 'Objet de démonstration publié sous licence CC0 par Poly Haven.',
      rightsHolder:
        'Modèle CC0, Poly Haven. Il ne s’agit pas d’une œuvre malgache.',
      media: [
        image(
          'sculpture-02-m1',
          'poster.png',
          objectModels.antiqueVase.poster,
          { width: 1024, height: 1024 },
        ),
      ],
      model: objectModels.antiqueVase,
      createdAt: T0,
    }),
    published({
      id: 'sculpture-03',
      depositNumber: 'KT-2026-0107',
      title: 'Coupe en bois tourné',
      author: 'Modèle 3D : Kuutti Siitonen (Poly Haven)',
      medium: 'sculpture',
      room: { slug: 'sculpture', number: '03' },
      period: 'Objet non daté, numérisation 2024',
      place: 'Objet d’étude, hors collection',
      technique: 'Numérisation 3D d’un objet en bois',
      dimensions: '13,1 × 12,5 × 7,3 cm',
      region: 'Hors collection',
      summary:
        'Une petite coupe en bois, agrandie pour rester lisible depuis l’allée.',
      story: 'Objet de démonstration publié sous licence CC0 par Poly Haven.',
      rightsHolder:
        'Modèle CC0, Poly Haven. Il ne s’agit pas d’une œuvre malgache.',
      media: [
        image('sculpture-03-m1', 'poster.png', objectModels.woodenBowl.poster, {
          width: 1024,
          height: 1024,
        }),
      ],
      model: objectModels.woodenBowl,
      createdAt: T0,
    }),
  ];
}

function submission(
  base: Omit<
    Item,
    | 'model3d'
    | 'verification'
    | 'provenance'
    | 'isDemo'
    | 'room'
    | 'publication'
  > & { publication?: Item['publication'] },
): Item {
  return {
    ...base,
    model3d: { contentId: base.id, status: 'missing', variants: null },
    verification: NO_VERIFICATION,
    provenance: NO_PROVENANCE,
    isDemo: true,
    room: null,
    publication: base.publication ?? 'draft',
  };
}

export function demoSubmissions(): Item[] {
  return [
    submission({
      id: 'sub-hautes-terres',
      depositNumber: 'KT-2026-0148',
      ownerId: 'acc-contributor',
      title: 'Hautes Terres, fin du jour',
      author: 'Rasoa Haingo',
      medium: 'painting',
      details: {
        period: '2024',
        place: 'Ambohimanga, Analamanga',
        technique: 'Huile sur toile',
        dimensions: '60 × 80 cm',
        region: 'Analamanga, Hautes Terres',
        summary:
          'La lumière rasante de la fin d’après-midi sur les rizières en terrasses et les maisons de briques à balcons de bois.',
        story:
          'L’artiste peint le paysage de son enfance, tel qu’elle le voit encore chaque soir en rentrant au village.',
      },
      media: [
        image(
          'sub-ht-m1',
          'vue-de-face.jpg',
          artworkImages.bridgeAtAmbaniala.src,
          artworkImages.bridgeAtAmbaniala,
        ),
      ],
      rights: {
        relationship: 'author',
        holder: 'Rasoa Haingo',
        consentShare: true,
        consentDisplay: true,
      },
      review: {
        state: 'pending',
        itemClaims: 'unreviewed',
        descriptionClaims: 'unreviewed',
        rationale: null,
        reviewerName: null,
        requestedChanges: null,
        updatedAt: null,
      },
      createdAt: '2026-11-21T10:12:00.000Z',
      updatedAt: '2026-11-21T10:40:00.000Z',
      history: [
        {
          id: 'sub-ht-h1',
          at: '2026-11-21T10:12:00.000Z',
          actor: 'contributor',
          label: 'Fiche créée',
          detail: null,
        },
        {
          id: 'sub-ht-h2',
          at: '2026-11-21T10:40:00.000Z',
          actor: 'contributor',
          label: 'Envoyée en relecture',
          detail: 'Bordereau KT-2026-0148',
        },
      ],
    }),
    submission({
      id: 'sub-paysage-genere',
      depositNumber: 'KT-2026-0131',
      ownerId: 'acc-contributor',
      title: 'Paysage de baobabs au crépuscule',
      author: 'Compte de test',
      medium: 'painting',
      details: {
        period: '2026',
        place: 'Non précisé',
        technique: 'Image numérique',
        dimensions: '',
        region: 'Menabe',
        summary: 'Allée des baobabs au coucher du soleil.',
        story: '',
      },
      media: [
        {
          ...image(
            'sub-pg-m1',
            'generated-ai-baobabs.png',
            '/media/demo/absent.png',
            null,
          ),
          persistent: true,
        },
      ],
      rights: {
        relationship: 'author',
        holder: 'Compte de test',
        consentShare: true,
        consentDisplay: true,
      },
      review: {
        state: 'rejected',
        itemClaims: 'uncertain',
        descriptionClaims: 'uncertain',
        rationale:
          'Les signaux d’analyse indiquaient une image générée par IA et la relecture humaine l’a confirmé : métadonnées d’un outil de génération, absence de toute trace d’atelier. La collection n’accueille pas d’œuvres générées par IA.',
        reviewerName: 'Équipe de conservation',
        requestedChanges: null,
        updatedAt: '2026-11-20T16:05:00.000Z',
      },
      createdAt: '2026-11-20T14:30:00.000Z',
      updatedAt: '2026-11-20T16:05:00.000Z',
      history: [
        {
          id: 'sub-pg-h1',
          at: '2026-11-20T14:30:00.000Z',
          actor: 'contributor',
          label: 'Fiche créée et envoyée en relecture',
          detail: null,
        },
        {
          id: 'sub-pg-h2',
          at: '2026-11-20T14:31:00.000Z',
          actor: 'system',
          label: 'Analyse assistée : indice de génération par IA élevé (0,81)',
          detail: 'Signal indicatif transmis à la relecture humaine.',
        },
        {
          id: 'sub-pg-h3',
          at: '2026-11-20T16:05:00.000Z',
          actor: 'reviewer',
          label: 'Refusée après relecture humaine',
          detail: 'Œuvre générée par IA, hors politique éditoriale.',
        },
      ],
    }),
    submission({
      id: 'sub-sinibe',
      depositNumber: 'KT-2026-0152',
      ownerId: 'acc-contributor',
      title: 'Sinibe d’Ambatolampy',
      author: 'Rasoa Haingo',
      medium: 'sculpture',
      details: {
        period: 'vers 1990',
        place: 'Ambatolampy',
        technique: 'Terre cuite',
        dimensions: '',
        region: 'Vakinankaratra',
        summary: '',
        story: '',
      },
      media: [],
      rights: {
        relationship: 'holder',
        holder: '',
        consentShare: false,
        consentDisplay: false,
      },
      review: {
        state: 'not_submitted',
        itemClaims: 'unreviewed',
        descriptionClaims: 'unreviewed',
        rationale: null,
        reviewerName: null,
        requestedChanges: null,
        updatedAt: null,
      },
      createdAt: '2026-11-22T08:00:00.000Z',
      updatedAt: '2026-11-22T08:00:00.000Z',
      history: [
        {
          id: 'sub-sb-h1',
          at: '2026-11-22T08:00:00.000Z',
          actor: 'contributor',
          label: 'Brouillon créé',
          detail: null,
        },
      ],
    }),
    submission({
      id: 'sub-lamba',
      depositNumber: 'KT-2026-0149',
      ownerId: 'acc-atelier',
      title: 'Lamba landy, tissage de soie',
      author: 'Atelier Soa',
      medium: 'craft',
      details: {
        period: '2023',
        place: 'Arivonimamo',
        technique: 'Tissage de soie sauvage',
        dimensions: '240 × 160 cm',
        region: 'Itasy, Hautes Terres',
        summary:
          'Un lamba de soie landy tissé à la main, de la préparation du fil à la pièce achevée.',
        story:
          'Quatre semaines de travail : préparer la soie, teindre, ourdir, tisser.',
      },
      media: [
        image(
          'sub-lb-m1',
          'lamba-atelier.jpg',
          artworkImages.malagasyWoman.src,
          artworkImages.malagasyWoman,
        ),
      ],
      rights: {
        relationship: 'representative',
        holder: 'Atelier Soa',
        consentShare: true,
        consentDisplay: true,
      },
      review: {
        state: 'changes_requested',
        itemClaims: 'unreviewed',
        descriptionClaims: 'uncertain',
        rationale: 'La photographie ne montre pas la pièce entière.',
        reviewerName: 'Équipe de conservation',
        requestedChanges:
          'Ajouter une photographie de la pièce entière à plat et préciser l’année de tissage.',
        updatedAt: '2026-11-21T15:00:00.000Z',
      },
      createdAt: '2026-11-21T11:00:00.000Z',
      updatedAt: '2026-11-21T15:00:00.000Z',
      history: [
        {
          id: 'sub-lb-h1',
          at: '2026-11-21T11:00:00.000Z',
          actor: 'contributor',
          label: 'Envoyée en relecture',
          detail: null,
        },
        {
          id: 'sub-lb-h2',
          at: '2026-11-21T15:00:00.000Z',
          actor: 'reviewer',
          label: 'Corrections demandées',
          detail: 'Photographie de la pièce entière et année de tissage.',
        },
      ],
    }),
  ];
}

export function seedMockState(): MockState {
  return {
    version: 1,
    accounts: demoAccounts.map((account) => ({ ...account })),
    sessionAccountId: null,
    items: [...publishedItems(), ...demoSubmissions()],
    scans: [],
    counter: 152,
    revision: 1,
    mintKeys: {},
  };
}
