import type { TriageResponse } from "@/types/triage";

interface Props {
  result: TriageResponse;
}

const DECISION_COLORS: Record<string, string> = {
  archivar: "bg-gray-100 text-gray-700 border-gray-300",
  "avisar ahora": "bg-red-100 text-red-800 border-red-300",
  "revisar a mano": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "cola normal": "bg-green-100 text-green-700 border-green-300",
};

const INTENT_LABELS: Record<string, string> = {
  pregunta: "Pregunta",
  pedido: "Pedido",
  queja: "Queja",
  spam: "Spam",
  otro: "Otro",
};

function Pill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const pct = Math.round(value * 100);
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg text-xs ${highlight ? "bg-blue-50 font-semibold" : "bg-gray-50"}`}
    >
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-500">{pct}%</span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="bg-blue-500 h-1.5 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ResultPanel({ result }: Props) {
  const { judgments, decision } = result;
  const { intent, urgent_reply, anger } = judgments;

  const decisionColor =
    DECISION_COLORS[decision.label] ??
    "bg-blue-100 text-blue-800 border-blue-300";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Column A – TypeSafe model judgments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <span className="inline-block text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
            TypeSafe (modelo)
          </span>
          <h2 className="text-base font-bold text-gray-900">
            Juicios del modelo
          </h2>
        </div>

        {/* Intent */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Intención
            </h3>
            <span className="text-xs text-gray-400">
              confianza {Math.round(intent.confidence * 100)}%
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {INTENT_LABELS[intent.choice] ?? intent.choice}
          </div>
          <div className="space-y-1">
            {Object.entries(intent.probabilities).map(([key, prob]) => (
              <Pill
                key={key}
                label={INTENT_LABELS[key] ?? key}
                value={prob}
                highlight={key === intent.choice}
              />
            ))}
          </div>
        </section>

        {/* Urgent reply */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Respuesta urgente (noul)
          </h3>
          <div className="flex items-center gap-3">
            <ProgressBar value={urgent_reply.noul} />
            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
              {Math.round(urgent_reply.noul * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-400">
            ≥ 50% = urgente para la política
          </p>
        </section>

        {/* Anger score */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Enojo (score)
            </h3>
            <span className="text-xs text-gray-400">
              nivel {anger.score.toFixed(2)} / {Object.keys(anger.legend).length}
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(anger.legend).map(([num, desc]) => {
              const idx = parseInt(num, 10);
              const prob = anger.probabilities[num] ?? 0;
              const isActive = Math.round(anger.score) === idx;
              return (
                <div
                  key={num}
                  className={`px-3 py-2 rounded-lg text-xs space-y-1 ${isActive ? "bg-orange-50 border border-orange-200" : "bg-gray-50"}`}
                >
                  <div className="flex justify-between">
                    <span
                      className={`font-medium ${isActive ? "text-orange-800" : "text-gray-700"}`}
                    >
                      Nivel {num}: {desc}
                    </span>
                    <span className="text-gray-400">
                      {Math.round(prob * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full ${isActive ? "bg-orange-400" : "bg-gray-300"}`}
                      style={{ width: `${Math.round(prob * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Column B – Code policy decision */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-1">
            Código (política)
          </span>
          <h2 className="text-base font-bold text-gray-900">
            Decisión de política
          </h2>
        </div>

        {/* Decision label */}
        <div
          className={`border rounded-xl px-5 py-4 text-center space-y-1 ${decisionColor}`}
        >
          <p className="text-2xl font-bold capitalize">{decision.label}</p>
          <p className="text-xs opacity-70">Decisión final</p>
        </div>

        {/* Rule that fired */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Regla aplicada
          </p>
          <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-700 font-mono break-all">
            {decision.ruleId}
          </code>
        </div>

        {/* Policy rules reference */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Todas las reglas (orden de evaluación)
          </p>
          <ol className="space-y-1.5 text-xs text-gray-600">
            {[
              {
                id: "spam→archivar",
                label: "archivar",
                condition: "intent = spam",
              },
              {
                id: "urgent+conf≥0.75→avisar ahora",
                label: "avisar ahora",
                condition: "noul ≥ 0.5 AND confianza ≥ 0.75",
              },
              {
                id: "conf<0.55→revisar a mano",
                label: "revisar a mano",
                condition: "confianza < 0.55",
              },
              {
                id: "default→cola normal",
                label: "cola normal",
                condition: "default",
              },
            ].map((rule, i) => (
              <li
                key={rule.id}
                className={`flex gap-2 p-2 rounded-lg ${rule.id === decision.ruleId ? "bg-violet-50 border border-violet-200" : ""}`}
              >
                <span className="text-gray-400 shrink-0">{i + 1}.</span>
                <span>
                  <span className="font-medium">{rule.condition}</span>
                  {" → "}
                  <span className="font-semibold">{rule.label}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-gray-400">
          Ver{" "}
          <a
            href="https://github.com/gastonmira/typesafe-triage-demo/blob/main/src/lib/policy.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            src/lib/policy.ts
          </a>{" "}
          para los umbrales exactos.
        </p>
      </div>
    </div>
  );
}
