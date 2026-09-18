export interface ChoiceJudgment {
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface NoulJudgment {
  noul: number;
}

export interface ScoreJudgment {
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface Judgments {
  intent: ChoiceJudgment;
  urgent_reply: NoulJudgment;
  anger: ScoreJudgment;
}

export type DecisionLabel =
  | "archivar"
  | "avisar ahora"
  | "revisar a mano"
  | "cola normal";

export interface PolicyDecision {
  label: DecisionLabel;
  ruleId: string;
}

export interface TriageResponse {
  judgments: Judgments;
  decision: PolicyDecision;
}

export interface TriageRequest {
  text: string;
}
