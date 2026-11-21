// Copy shown on the gallery walls. Positions live in Overlays.tsx.

export const hero = {
  lines: ["EVERY ART", "DESERVES A", "MUSEUM"],
  descriptor: "A free platform to scan, show and pass on every form of art",
  bubble: "Scan a work",
  cta: "Start the visit",
};

export const features = {
  title: "What ARTIKO does",
  intro:
    "ARTIKO is a free platform, on the web and on Android, that helps save, value and pass on art. Scan a painting or a song to learn who made it and whether it is proven human-made. Visit each artist's 3D museum, vote for the best works and learn endangered skills from the masters who still hold them.",
  items: [
    {
      title: "Scan any work",
      text: "Point your phone at a painting, a mural or a poster, or let it listen to a song. ARTIKO tells you who made it and shows its sources.",
    },
    {
      title: "Artist museums",
      text: "Every artist gets a personal 3D museum with a link they can share anywhere. Walk through it on the web or in the app.",
    },
    {
      title: "Monthly vote",
      text: "One vote per person per category each month. Half public, half jury, so the best work wins, not the loudest.",
    },
    {
      title: "Hall of Fame",
      text: "Each month the top 5 of every category enter a shared museum, from painting to music, dance and oral arts.",
    },
    {
      title: "Learn from masters",
      text: "Ghost Master shows a master's hands in AR over yours and scores each gesture, from a weaving knot to a kabary speech.",
    },
    {
      title: "Protect and archive",
      text: "Proof of process, Content Credentials and three safe copies keep every work traceable and preserved.",
    },
  ],
  more: "Didn't find what you need? See all the features!",
};

export const featured = {
  title: "Featured works",
  text: "Every month the public and a jury choose the five best works in each category. These public-domain masterpieces open our Classics wing, so the museum is never empty.",
  cta: "See all works",
};

export type Work = {
  image: string;
  title: string;
  meta: string;
  text: string;
  source: string;
};

export const works: Work[] = [
  {
    image: "/museum/assets/monet.webp",
    title: "Water Lilies",
    meta: "Claude Monet · 1906",
    text: "Painted in his garden at Giverny, one of about 250 water-lily canvases. Art Institute of Chicago.",
    source: "https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1933.1157_-_Art_Institute_of_Chicago.jpg",
  },
  {
    image: "/museum/assets/vangogh.webp",
    title: "The Bedroom",
    meta: "Vincent van Gogh · 1889",
    text: "His room in Arles, painted three times. This second version hangs in Chicago.",
    source: "https://commons.wikimedia.org/wiki/File:Van_Gogh_-_The_Bedroom%2C_1889_Chicago.jpg",
  },
  {
    image: "/museum/assets/seurat.webp",
    title: "La Grande Jatte",
    meta: "Georges Seurat · 1884–1886",
    text: "Thousands of small dots of pure colour that mix in the eye of the viewer.",
    source: "https://commons.wikimedia.org/wiki/File:Georges_Seurat_-_Un_dimanche_apr%C3%A8s-midi_%C3%A0_l%27%C3%8Ele_de_la_Grande_Jatte.jpg",
  },
  {
    image: "/gallery/wave.webp",
    title: "The Great Wave",
    meta: "Katsushika Hokusai · c. 1831",
    text: "A woodblock print made in thousands of copies, a craft passed from carver to printer.",
    source: "https://commons.wikimedia.org/wiki/File:Tsunami_by_hokusai_19th_century.jpg",
  },
  {
    image: "/gallery/pearl.webp",
    title: "Girl with a Pearl Earring",
    meta: "Johannes Vermeer · c. 1665",
    text: "A study of a face rather than a portrait of a known sitter. Mauritshuis, The Hague.",
    source: "https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg",
  },
  {
    image: "/gallery/starry.webp",
    title: "The Starry Night",
    meta: "Vincent van Gogh · 1889",
    text: "The view from his window at Saint-Rémy, just before sunrise. MoMA, New York.",
    source: "https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  },
];

export const neon = ["NO ART LEFT BEHIND,", "NO MASTER FORGOTTEN!"];

export const about = {
  title: "Why ARTIKO",
  text: "ARTIKO is one platform where artists are credited, works are proven and skills are passed on. Every art form counts: crafts, painting, sculpture, music, dance, languages and the spoken word, like the Malagasy kabary. Artists choose what is shown, explained or kept private.",
  cta: "About ARTIKO",
};

export const contact = {
  cta: "Join as an artist",
};

// Scroll stops used by the menu, as camera x positions in scene units.
export const stops = [
  { label: "Home", x: 0 },
  { label: "Features", x: 1730 },
  { label: "Hall of Fame", x: 5970 },
  { label: "Works", x: 7120 },
  { label: "About", x: 15300 },
  { label: "Contact", x: Infinity },
] as const;
