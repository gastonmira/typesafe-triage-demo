import type { Judgments, PolicyDecision } from "@/types/triage";

/**
 * Fixed thresholds — never edited from the UI.
 *
 * Rule evaluation order (first match wins):
 *   1. spam → archivar
 *   2. urgent (noul ≥ 0.5) AND intent confidence ≥ 0.75 → avisar ahora
 *   3. intent confidence < 0.55 → revisar a mano
 *   4. default → cola normal
 */
export function applyPolicy(judgments: Judgments): PolicyDecision {
  const { intent, urgent_reply } = judgments;

  if (intent.choice === "spam") {
    return { label: "archivar", ruleId: "spam→archivar" };
  }

  if (urgent_reply.noul >= 0.5 && intent.confidence >= 0.75) {
    return {
      label: "avisar ahora",
      ruleId: "urgent+conf≥0.75→avisar ahora",
    };
  }

  if (intent.confidence < 0.55) {
    return { label: "revisar a mano", ruleId: "conf<0.55→revisar a mano" };
  }

  return { label: "cola normal", ruleId: "default→cola normal" };
}
