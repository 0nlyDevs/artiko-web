/** Lower case without accents, so "Peinture" finds "peinture" and "Ambositra" finds "ambositrà". */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** True when every word of the query appears somewhere in the fields. An empty query matches everything. */
export function matchesQuery(fields: (string | null | undefined)[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(fields.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}
