// Structure of the gallery walls: which features, works and slides exist, and where they point.
// All the words live in the i18n dictionaries (src/i18n); each entry holds the keys it reads.
// Positions live in Overlays.tsx.

import type { Key } from "@/i18n/en";

export type FeatureKey = "scan" | "museum" | "vote" | "fame" | "learn" | "protect";

export const featureKeys: FeatureKey[] = ["scan", "museum", "vote", "fame", "learn", "protect"];

export type Work = {
  id: "water" | "walking" | "gymnopedie" | "chihongo" | "julia" | "kabary";
  kind: Key;
  source: string;
  // Frame content: a picture, or a card drawn at runtime.
  image?: string;
  fit?: "cover" | "contain";
  card?: "music" | "oral";
};

export const works: Work[] = [
  {
    id: "water",
    kind: "art.painting",
    image: "/gallery/monet.webp",
    source: "https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1933.1157_-_Art_Institute_of_Chicago.jpg",
  },
  {
    id: "walking",
    kind: "art.sculpture",
    image: "/gallery/walking-man.webp",
    fit: "contain",
    source: "https://www.artic.edu/artworks/69852",
  },
  {
    id: "gymnopedie",
    kind: "art.music",
    card: "music",
    source: "https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1..ogg",
  },
  {
    id: "chihongo",
    kind: "art.mask",
    image: "/gallery/chihongo-mask.webp",
    fit: "contain",
    source: "https://www.artic.edu/artworks/181740",
  },
  {
    id: "julia",
    kind: "art.photography",
    image: "/gallery/julia-jackson.webp",
    fit: "contain",
    source: "https://www.artic.edu/artworks/29230",
  },
  {
    id: "kabary",
    kind: "art.oral",
    card: "oral",
    source: "https://en.wikipedia.org/wiki/Kabary",
  },
];

// Slides shown on the showreel screen while it plays.
export const showreel: { image: string; kind: Key; label: Key }[] = [
  { image: "/gallery/starry.webp", kind: "art.painting", label: "reel.starry" },
  { image: "/gallery/degas-ballet.webp", kind: "art.dance", label: "reel.ballet" },
  { image: "/gallery/berain-tapestry.webp", kind: "art.textile", label: "reel.elephant" },
  { image: "/gallery/wave.webp", kind: "art.print", label: "reel.wave" },
  { image: "/gallery/pearl.webp", kind: "art.portrait", label: "reel.pearl" },
];

export const neon: Key[] = ["neon.line1", "neon.line2"];

export const heroLines: Key[] = ["hero.line1", "hero.line2", "hero.line3"];

export const aboutTags: Key[] = ["art.crafts", "art.painting", "art.sculpture", "art.music", "art.dance", "art.words"];

export const marquee: Key[] = ["art.painting", "art.music", "art.dance", "art.sculpture", "art.crafts", "art.photography", "art.oral", "art.textile"];

// Scroll stops used by the menu, as camera x positions in scene units.
export const stops = [
  { label: "stop.home", x: 0 },
  { label: "stop.features", x: 1730 },
  { label: "stop.showreel", x: 5970 },
  { label: "stop.hall", x: 7120 },
  { label: "stop.forms", x: 9300 },
  { label: "stop.about", x: 15300 },
  { label: "stop.contact", x: Infinity },
] as const satisfies readonly { label: Key; x: number }[];
