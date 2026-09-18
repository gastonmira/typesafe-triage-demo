import { applyPolicy } from "@/lib/policy";
import type { Judgments } from "@/types/triage";

function makeJudgments(overrides: Partial<Judgments> = {}): Judgments {
  return {
    intent: {
      choice: "pregunta",
      probabilities: { pregunta: 0.9, pedido: 0.05, queja: 0.03, spam: 0.01, otro: 0.01 },
      confidence: 0.85,
    },
    urgent_reply: { noul: 0.1 },
    anger: {
      score: 1,
      legend: { "1": "Calmo / neutro profesional", "2": "Molesto leve", "3": "Frustrado claro", "4": "Enojado / agresivo" },
      probabilities: { "1": 0.8, "2": 0.1, "3": 0.07, "4": 0.03 },
      confidence: 0.8,
    },
    ...overrides,
  };
}

describe("applyPolicy", () => {
  describe("Rule 1: spam → archivar", () => {
    it("returns archivar when intent is spam", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "spam",
          probabilities: { pregunta: 0.01, pedido: 0.01, queja: 0.01, spam: 0.96, otro: 0.01 },
          confidence: 0.95,
        },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("archivar");
      expect(result.ruleId).toBe("spam→archivar");
    });

    it("returns archivar for spam even when noul is high", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "spam",
          probabilities: { pregunta: 0.01, pedido: 0.01, queja: 0.01, spam: 0.96, otro: 0.01 },
          confidence: 0.99,
        },
        urgent_reply: { noul: 0.9 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("archivar");
    });
  });

  describe("Rule 2: urgent + confidence ≥ 0.75 → avisar ahora", () => {
    it("returns avisar ahora when noul ≥ 0.5 and confidence ≥ 0.75", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "pedido",
          probabilities: { pregunta: 0.05, pedido: 0.85, queja: 0.05, spam: 0.02, otro: 0.03 },
          confidence: 0.8,
        },
        urgent_reply: { noul: 0.7 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("avisar ahora");
      expect(result.ruleId).toBe("urgent+conf≥0.75→avisar ahora");
    });

    it("does NOT return avisar ahora when noul < 0.5", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "pedido",
          probabilities: { pregunta: 0.05, pedido: 0.85, queja: 0.05, spam: 0.02, otro: 0.03 },
          confidence: 0.8,
        },
        urgent_reply: { noul: 0.49 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).not.toBe("avisar ahora");
    });

    it("does NOT return avisar ahora when confidence < 0.75", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "pedido",
          probabilities: { pregunta: 0.05, pedido: 0.74, queja: 0.1, spam: 0.05, otro: 0.06 },
          confidence: 0.74,
        },
        urgent_reply: { noul: 0.9 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).not.toBe("avisar ahora");
    });

    it("returns avisar ahora at noul exactly 0.5 and confidence exactly 0.75", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "queja",
          probabilities: { pregunta: 0.05, pedido: 0.05, queja: 0.8, spam: 0.05, otro: 0.05 },
          confidence: 0.75,
        },
        urgent_reply: { noul: 0.5 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("avisar ahora");
    });
  });

  describe("Rule 3: confidence < 0.55 → revisar a mano", () => {
    it("returns revisar a mano when confidence is below 0.55", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "otro",
          probabilities: { pregunta: 0.25, pedido: 0.2, queja: 0.2, spam: 0.15, otro: 0.2 },
          confidence: 0.4,
        },
        urgent_reply: { noul: 0.2 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("revisar a mano");
      expect(result.ruleId).toBe("conf<0.55→revisar a mano");
    });

    it("does NOT return revisar a mano when confidence is exactly 0.55", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "pregunta",
          probabilities: { pregunta: 0.55, pedido: 0.2, queja: 0.1, spam: 0.1, otro: 0.05 },
          confidence: 0.55,
        },
        urgent_reply: { noul: 0.2 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).not.toBe("revisar a mano");
    });
  });

  describe("Rule 4: default → cola normal", () => {
    it("returns cola normal when no other rule fires", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "pregunta",
          probabilities: { pregunta: 0.85, pedido: 0.05, queja: 0.05, spam: 0.02, otro: 0.03 },
          confidence: 0.85,
        },
        urgent_reply: { noul: 0.1 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("cola normal");
      expect(result.ruleId).toBe("default→cola normal");
    });

    it("returns cola normal when confidence is 0.6 and urgency is 0.3", () => {
      const judgments = makeJudgments({
        intent: {
          choice: "queja",
          probabilities: { pregunta: 0.1, pedido: 0.1, queja: 0.6, spam: 0.1, otro: 0.1 },
          confidence: 0.6,
        },
        urgent_reply: { noul: 0.3 },
      });
      const result = applyPolicy(judgments);
      expect(result.label).toBe("cola normal");
    });
  });
});
