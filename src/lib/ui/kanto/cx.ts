/** Joins the class names that are set, so CSS Module lookups can be combined. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
