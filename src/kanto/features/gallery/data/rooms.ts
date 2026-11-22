import type { AmbienceTrack } from '../../../lib/audio/ambience';
import {
  artworkImages,
  audioTracks,
  objectModels,
  posterImage,
} from '../../../lib/media/media';
import type { ImageSource } from '../../../lib/media/media';

/*
 * Gallery content. This single module stands in for the future Content API
 * through the gateway (FE-03). The shape is a provisional frontend view model
 * to align with papangoo's Content contract before integration.
 *
 * The works below are real, public-domain or CC0 artworks found on Wikimedia
 * Commons and the Smithsonian Open Access. Sources: apps/frontend/media-sources.md.
 */

export type RoomSlug = 'peinture' | 'sculpture' | 'savoir-faire' | 'musique';

/** Medium of the room, which selects the exhibit slot of the template. */
export type RoomMedium = 'painting' | 'sculpture' | 'craft' | 'music';

/** Per-claim review status required by the MVP. */
export type VerificationStatus = 'verified' | 'unreviewed' | 'uncertain';

/** A prepared 3D scan, per ADR 0001 (D12 option A): 1K by default, 2K on demand, a poster. */
export interface ArtworkModel {
  model1k: string;
  model2k?: string | undefined;
  poster: string;
  /** Whether the underside was scanned, so the viewer may show it. */
  bottomScanned: boolean;
  /** Height of the object as it stands in the WebGL room, in metres. */
  displayHeight: number;
}

export interface Artwork {
  /** Two-digit position in the room, also used in the URL: /musee/peinture/01. */
  number: string;
  title: string;
  artist: string;
  year: string;
  technique: string;
  dimensions: string;
  region: string;
  provenance: string;
  story: readonly string[];
  rights: string;
  image: ImageSource;
  alt: string;
  /** CSS object-position used when the frame opening crops the image. */
  focalPoint?: string | undefined;
  /** Sculptures carry a 3D model; `image` is then its poster. */
  model?: ArtworkModel | undefined;
  /** Demo items illustrate the visit and are not part of the collection. */
  isDemo: boolean;
  verification: VerificationStatus;
  /** Id of the published record behind this work, for the full item page. */
  itemId?: string | undefined;
}

export interface RoomAmbience {
  /** Wall finish used when no scene photograph exists for the room. */
  wallTone: 'red' | 'stone' | 'ochre' | 'indigo';
  /** Whether the room uses the committed red room photograph. */
  usesRedRoomScene: boolean;
  track: AmbienceTrack | null;
}

export interface Room {
  slug: RoomSlug;
  number: string;
  /** Short name used in tabs and the top bar. */
  name: string;
  /** Malagasy room label shown on the wall. */
  malagasyLabel: string;
  titleLines: readonly string[];
  subtitle: string;
  wallText: readonly string[];
  medium: RoomMedium;
  ambience: RoomAmbience;
  artworks: readonly Artwork[];
}

export const rooms: readonly Room[] = [
  {
    slug: 'peinture',
    number: '01',
    name: 'Peinture',
    malagasyLabel: 'Efitrano 01',
    titleLines: ['Les couleurs', 'des Hautes', 'Terres'],
    subtitle: 'Latérite, rizières et lumière de l’Imerina.',
    wallText: [
      'Les peintres des Hautes Terres reviennent sans cesse à la terre rouge, aux rizières en terrasses et aux maisons de briques à balcons de bois.',
      'Chaque œuvre de cette salle a été déposée par son auteur, avec son récit, sa technique et sa provenance.',
    ],
    medium: 'painting',
    ambience: {
      wallTone: 'red',
      usesRedRoomScene: true,
      track: audioTracks.valiha,
    },
    artworks: [
      {
        number: '01',
        itemId: 'peinture-01',
        title: 'Femme malgache',
        artist: 'Antonio Zeno Shindler',
        year: 'vers 1893',
        technique: 'Huile sur toile',
        dimensions: '106,8 × 71,1 cm',
        region: 'Madagascar, lieu non précisé',
        provenance:
          'Smithsonian American Art Museum, Washington, n° d’inventaire 1985.66.165,709.',
        story: [
          'Une femme debout, drapée dans un lamba rayé, devant des maisons. Le titre d’origine est « Malagasy Woman ».',
          'Antonio Zeno Shindler (1813–1899) a peint des portraits de peuples du monde pour la Smithsonian Institution.',
        ],
        rights:
          'Domaine public : l’auteur est mort en 1899. Image diffusée par le Smithsonian Open Access sous licence CC0.',
        image: artworkImages.malagasyWoman,
        alt: 'Peinture d’une femme malgache debout, drapée dans un lamba rayé, devant des maisons.',
        isDemo: true,
        verification: 'unreviewed',
      },
      {
        number: '02',
        itemId: 'peinture-02',
        title: 'Antongona',
        artist: 'Anonyme, monogramme « W.J. »',
        year: '1875',
        technique: 'Encre, aquarelle et gouache sur papier',
        dimensions: '23,5 × 34,3 cm',
        region: 'Imerina, Hautes Terres',
        provenance:
          'Collection privée. Vendu par Abbott and Holder, Londres, en 2020. Inscription au dos : « Edward Birchall Esq, Leeds ».',
        story: [
          'Une colline de granit de l’Imerina, ses maisons et ses terrasses, peintes en couleurs en 1875.',
          'Antongona est l’un des anciens sites fortifiés des collines qui entourent Antananarivo.',
        ],
        rights:
          'Domaine public : œuvre de 1875. Reproduction photographique d’une œuvre en deux dimensions, via Wikimedia Commons.',
        image: artworkImages.antongona,
        alt: 'Aquarelle d’une colline rocheuse de l’Imerina avec des maisons, de la terre rouge et des terrasses.',
        focalPoint: '50% 45%',
        isDemo: true,
        verification: 'unreviewed',
      },
      {
        number: '03',
        itemId: 'peinture-03',
        title: 'Pont d’Ambaniala',
        artist: 'William Ellis',
        year: '1838',
        technique: 'Lithographie',
        dimensions: 'Non renseignées',
        region: 'Imerina, Hautes Terres',
        provenance:
          'Planche de « History of Madagascar », volume 2, Londres, 1838.',
        story: [
          'Une chaussée traverse les rizières, avec des zébus et les collines à l’horizon.',
          'William Ellis (1794–1872), missionnaire et auteur, a publié cette vue dans son histoire de Madagascar.',
        ],
        rights:
          'Domaine public : l’auteur est mort en 1872. Reproduction via Wikimedia Commons.',
        image: artworkImages.bridgeAtAmbaniala,
        alt: 'Lithographie d’une chaussée traversant des rizières, avec des zébus et des collines.',
        isDemo: true,
        verification: 'unreviewed',
      },
      {
        number: '04',
        itemId: 'peinture-04',
        title: 'Scène de divination par le sikidy, Tananarive',
        artist: 'Henri Ratovo',
        year: '1912',
        technique: 'Peinture, technique non confirmée',
        dimensions: 'Non renseignées',
        region: 'Antananarivo, Hautes Terres',
        provenance:
          'Reproduction issue d’un catalogue de vente (MutualArt). Détenteur actuel non confirmé.',
        story: [
          'Un intérieur aux murs de terre rouge, où des personnes en lamba assistent à une séance de sikidy, la divination par les graines.',
        ],
        rights:
          'Domaine public à Madagascar (loi n° 94-036). La date de décès de l’auteur, 1929 selon des sources non confirmées, reste à vérifier.',
        image: artworkImages.sikidy,
        alt: 'Peinture d’un intérieur aux murs rouges où des personnes en lamba entourent un devin.',
        isDemo: true,
        verification: 'uncertain',
      },
    ],
  },
  {
    slug: 'sculpture',
    number: '02',
    name: 'Sculpture',
    malagasyLabel: 'Efitrano 02',
    titleLines: ['Mémoire', 'du bois'],
    subtitle: 'Aloalo, poteaux sculptés et figures du Sud.',
    wallText: [
      'Dans le Sud-Ouest, les Mahafaly dressent sur les tombeaux des aloalo, poteaux de bois sculptés qui racontent la vie des défunts.',
      'En attendant les numérisations de la collection, trois objets d’étude règlent la visionneuse : faites-les tourner pour en découvrir chaque face.',
    ],
    medium: 'sculpture',
    ambience: {
      wallTone: 'stone',
      usesRedRoomScene: false,
      track: audioTracks.valiha,
    },
    artworks: [
      {
        number: '01',
        itemId: 'sculpture-01',
        title: 'Pot en terre cuite vernissée',
        artist: 'Modèle 3D : Aron Łyczek (Poly Haven)',
        year: 'Objet non daté, numérisation publiée en 2026',
        technique: 'Numérisation 3D d’un objet en céramique',
        dimensions: '65,6 × 50,2 × 37,2 cm',
        region: 'Objet d’étude, hors collection',
        provenance:
          'Poly Haven, modèle « Ceramic Pot », publié le 3 juillet 2026.',
        story: [
          'Objet de démonstration : ce pot vernissé, patiné par l’usage, règle la visionneuse 3D de la salle en attendant les numérisations des œuvres de la collection.',
          'Les aloalo et les figures du Sud seront présentés de la même façon, à faire tourner pour en découvrir chaque face.',
        ],
        rights:
          'Modèle 3D publié sous licence CC0 par Poly Haven (polyhaven.com/a/ceramic_pot). Il ne s’agit pas d’une œuvre malgache.',
        image: posterImage(objectModels.ceramicPot),
        alt: 'Pot en céramique vernissée, aux reflets patinés, posé sur un socle.',
        model: {
          ...objectModels.ceramicPot,
          bottomScanned: false,
          displayHeight: 0.37,
        },
        isDemo: true,
        verification: 'unreviewed',
      },
      {
        number: '02',
        itemId: 'sculpture-02',
        title: 'Vase ancien en céramique à décor peint',
        artist: 'Modèle 3D : James Ray Cock (Poly Haven)',
        year: 'Objet non daté, numérisation publiée en 2021',
        technique: 'Numérisation 3D d’un objet en céramique',
        dimensions: '25,5 × 25,5 × 44 cm',
        region: 'Objet d’étude, hors collection',
        provenance:
          'Poly Haven, modèle « Antique Ceramic Vase 01 », publié le 15 juin 2021.',
        story: [
          'Objet de démonstration : un vase à décor peint dont la panse et le col montrent comment la lumière de la salle révèle un volume.',
        ],
        rights:
          'Modèle 3D publié sous licence CC0 par Poly Haven (polyhaven.com/a/antique_ceramic_vase_01). Il ne s’agit pas d’une œuvre malgache.',
        image: posterImage(objectModels.antiqueVase),
        alt: 'Vase en céramique à décor peint, posé sur un socle.',
        model: {
          ...objectModels.antiqueVase,
          bottomScanned: false,
          displayHeight: 0.44,
        },
        isDemo: true,
        verification: 'unreviewed',
      },
      {
        number: '03',
        itemId: 'sculpture-03',
        title: 'Coupe en bois tourné',
        artist: 'Modèle 3D : Kuutti Siitonen (Poly Haven)',
        year: 'Objet non daté, numérisation publiée en 2024',
        technique: 'Numérisation 3D d’un objet en bois',
        dimensions: '13,1 × 12,5 × 7,3 cm, présentée agrandie 2,5 fois',
        region: 'Objet d’étude, hors collection',
        provenance:
          'Poly Haven, modèle « Wooden Bowl 02 », publié le 26 juillet 2024.',
        story: [
          'Objet de démonstration : une petite coupe en bois, agrandie pour rester lisible depuis l’allée, qui prépare la présentation des objets de la salle Savoir-faire.',
        ],
        rights:
          'Modèle 3D publié sous licence CC0 par Poly Haven (polyhaven.com/a/wooden_bowl_02). Il ne s’agit pas d’une œuvre malgache.',
        image: posterImage(objectModels.woodenBowl),
        alt: 'Coupe en bois tourné, posée sur un socle.',
        model: {
          ...objectModels.woodenBowl,
          bottomScanned: false,
          displayHeight: 0.18,
        },
        isDemo: true,
        verification: 'unreviewed',
      },
    ],
  },
  {
    slug: 'savoir-faire',
    number: '03',
    name: 'Savoir-faire',
    malagasyLabel: 'Efitrano 03',
    titleLines: ['Gestes', 'transmis'],
    subtitle: 'Tissage, vannerie et poterie, de main en main.',
    wallText: [
      'Lamba de soie, sobika tressées, poteries de terre : chaque objet porte un geste appris puis transmis.',
      'Les vidéos de cette salle suivront les artisans étape par étape.',
    ],
    medium: 'craft',
    ambience: {
      wallTone: 'ochre',
      usesRedRoomScene: false,
      track: audioTracks.valiha,
    },
    artworks: [],
  },
  {
    slug: 'musique',
    number: '04',
    name: 'Musique',
    malagasyLabel: 'Efitrano 04',
    titleLines: ['Le chant', 'du bambou'],
    subtitle: 'Valiha, marovany et chants des Hautes Terres.',
    wallText: [
      'La valiha, cithare tubulaire en bambou, est l’un des instruments emblématiques de Madagascar.',
      'Cette salle réunira des enregistrements à écouter comme dans une salle de concert.',
    ],
    medium: 'music',
    ambience: {
      wallTone: 'indigo',
      usesRedRoomScene: false,
      track: audioTracks.valiha,
    },
    artworks: [],
  },
];

export function findRoom(slug: string): Room | undefined {
  return rooms.find((room) => room.slug === slug);
}

export function roomPath(room: Room): string {
  const first = room.artworks[0];
  return first === undefined
    ? `/musee/${room.slug}`
    : `/musee/${room.slug}/${first.number}`;
}

export function artworkPath(room: Room, artwork: Artwork): string {
  return `/musee/${room.slug}/${artwork.number}`;
}
