"use client";

import { useState } from "react";
import type { TriageResponse } from "@/types/triage";
import { ResultPanel } from "@/components/ResultPanel";

const EXAMPLES = [
  "Hola, ¿cuál es el horario de atención el sábado?",
  "Necesito que me reembolsen YA, llevo 3 días sin respuesta.",
  "Su producto es una basura y voy a denunciarlos.",
  "Ganá $5000/día desde casa, hacé click acá: http://spam.example",
  "El PDF del contrato no abre en la página 4.",
];

export default function HomePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Error inesperado.";
        setError(msg);
        return;
      }

      setResult(data as TriageResponse);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            TypeSafe Triage Demo
          </h1>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Ingresá un mensaje libre. El modelo (TypeSafe) emite juicios
            estructurados; el código aplica la política y decide qué hacer.
          </p>
        </div>

        {/* Input area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <label
            htmlFor="message-input"
            className="block text-sm font-medium text-gray-700"
          >
            Mensaje
          </label>
          <textarea
            id="message-input"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[100px]"
            placeholder="Escribí o pegá un mensaje aquí…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAnalyze();
              }
            }}
          />

          {/* Example chips */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Ejemplos
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors cursor-pointer text-left"
                >
                  {ex.length > 50 ? ex.slice(0, 48) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? "Analizando…" : "Analizar"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && <ResultPanel result={result} />}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          La API key nunca llega al cliente.{" "}
          <a
            href="https://github.com/gastonmira/typesafe-triage-demo/blob/main/src/lib/policy.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            Ver política de código
          </a>
        </p>
      </div>
    </main>
  );
}
