// The rule of artiko-api (app/features/works/service.py): at least two proofs that count and no declared AI
// give the « Preuve humaine » badge. Whether an imported proof counts is a setting of the API, so what the
// form shows is a forecast: the badge itself is read from `human_proven` of the published work.
export const PROOFS_FOR_BADGE = 2;

export type BadgeForecast =
  /** Two proofs or more, no AI declared: the badge is expected. */
  | "expected"
  /** Not enough proofs yet. */
  | "short"
  /** AI assistance declared: no badge whatever the proofs, so no votes. */
  | "ai";

export function badgeForecast({ proofs, aiDeclared }: { proofs: number; aiDeclared: boolean }): BadgeForecast {
  if (aiDeclared) return "ai";
  return proofs >= PROOFS_FOR_BADGE ? "expected" : "short";
}
