// Copy shown on the gallery walls. Positions live in Overlays.tsx.

export const brand = "ARTIKO";

export const hero = {
  lines: ["EVERY ART", "DESERVES A", "MUSEUM"],
  descriptor: "The free app that scans any artwork, gives every artist a 3D museum and keeps skills alive",
  bubble: "Scan a work",
  cta: "Start the visit",
};

export type Feature = {
  key: "scan" | "museum" | "vote" | "fame" | "learn" | "protect";
  title: string;
  text: string;
};

export const features = {
  title: "What ARTIKO does",
  intro:
    "ARTIKO is a free platform, on the web and on Android, that protects and celebrates art in every form. Scan a work to know who made it, visit each artist's 3D museum, vote for the best works and learn rare skills from the masters who still hold them.",
  items: [
    { key: "scan", title: "Scan any work", text: "Point your phone at a painting or let it hear a song. ARTIKO tells you who made it, with sources." },
    { key: "museum", title: "Artist museums", text: "Every artist gets a personal 3D museum, with a link to share anywhere." },
    { key: "vote", title: "Monthly vote", text: "One vote per person per category. Half public, half jury, so the best work wins." },
    { key: "fame", title: "Hall of Fame", text: "Each month the top 5 of every art form enter a shared museum." },
    { key: "learn", title: "Learn from masters", text: "A master's hands appear in AR over yours and score each gesture." },
    { key: "protect", title: "Protect and archive", text: "Proof of process, credits and safe copies keep every work traceable." },
  ] satisfies Feature[],
  more: "Painting, music, dance, crafts, words: all in one place",
  cta: "Join ARTIKO",
};

export const featured = {
  title: "Hall of Fame",
  text: "Every month the public and a jury choose the five best works of each art form. These public-domain classics open the museum, so it is never empty.",
  cta: "See the works",
};

export type Work = {
  kind: string;
  title: string;
  meta: string;
  text: string;
  source: string;
  // Frame content: a picture, or a card drawn at runtime.
  image?: string;
  fit?: "cover" | "contain";
  card?: "music" | "oral";
};

export const works: Work[] = [
  {
    kind: "Painting",
    title: "Water Lilies",
    meta: "Claude Monet · 1906",
    text: "Light on water, painted in his own garden.",
    image: "/museum/assets/monet.webp",
    source: "https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1933.1157_-_Art_Institute_of_Chicago.jpg",
  },
  {
    kind: "Sculpture",
    title: "The Walking Man",
    meta: "Auguste Rodin · bronze",
    text: "No head, no arms: only the step forward.",
    image: "/gallery/walking-man.webp",
    fit: "contain",
    source: "https://www.artic.edu/artworks/69852",
  },
  {
    kind: "Music",
    title: "Gymnopédie No. 1",
    meta: "Erik Satie · 1888",
    text: "A melody lives as long as someone plays it.",
    card: "music",
    source: "https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1..ogg",
  },
  {
    kind: "Mask",
    title: "Chihongo",
    meta: "Chokwe · 19th century",
    text: "Wood, raffia and feathers, made to dance.",
    image: "/gallery/chihongo-mask.webp",
    fit: "contain",
    source: "https://www.artic.edu/artworks/181740",
  },
  {
    kind: "Photography",
    title: "Julia Jackson",
    meta: "Julia Margaret Cameron · 1867",
    text: "An early portrait made as art, not record.",
    image: "/gallery/julia-jackson.webp",
    fit: "contain",
    source: "https://www.artic.edu/artworks/29230",
  },
  {
    kind: "Oral art",
    title: "Kabary",
    meta: "Madagascar · the art of speech",
    text: "Proverbs and images, passed from voice to voice.",
    card: "oral",
    source: "https://en.wikipedia.org/wiki/Kabary",
  },
];

// Slides shown on the showreel screen while it plays.
export const showreel = [
  { image: "/gallery/starry.webp", kind: "Painting", label: "Van Gogh · The Starry Night" },
  { image: "/gallery/degas-ballet.webp", kind: "Dance", label: "Degas · Ballet at the Paris Opéra" },
  { image: "/gallery/berain-tapestry.webp", kind: "Textile", label: "Monnoyer · The Elephant" },
  { image: "/gallery/wave.webp", kind: "Print", label: "Hokusai · The Great Wave" },
  { image: "/gallery/pearl.webp", kind: "Portrait", label: "Vermeer · Girl with a Pearl Earring" },
];

export const neon = ["NO ART LEFT BEHIND,", "NO MASTER FORGOTTEN!"];

export const about = {
  title: "Why ARTIKO",
  text: "Art is more than paintings. ARTIKO gives the same place to crafts, sculpture, music, dance, photography and the spoken word, like the Malagasy kabary. Artists are credited, works are proven human-made and skills are passed on before they are lost.",
  tags: ["Crafts", "Painting", "Sculpture", "Music", "Dance", "Words"],
};

export const contact = {
  cta: "Join as an artist",
};

// Scroll stops used by the menu, as camera x positions in scene units.
export const stops = [
  { label: "Home", x: 0 },
  { label: "Features", x: 1730 },
  { label: "Showreel", x: 5970 },
  { label: "Hall of Fame", x: 7120 },
  { label: "Art forms", x: 9300 },
  { label: "About", x: 15300 },
  { label: "Contact", x: Infinity },
] as const;
