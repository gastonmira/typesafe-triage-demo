import { NextRequest, NextResponse } from "next/server";
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { applyPolicy } from "@/lib/policy";
import type { Judgments, TriageResponse } from "@/types/triage";

// Basic in-memory rate limit: max 20 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  if (!process.env.TYPESAFE_API_KEY) {
    return NextResponse.json(
      { error: "Servicio de análisis no configurado." },
      { status: 500 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intentá de nuevo en un minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const text =
    body && typeof body === "object" && "text" in body
      ? (body as { text: unknown }).text
      : undefined;

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "El campo text no puede estar vacío." },
      { status: 400 },
    );
  }

  const client = new TypeSafeClient();

  const response = await client.systemOne({
    state: { message: text.trim() },
    questions: {
      intent: choice(
        "¿Cuál es la intención principal de `message`?",
        {
          pregunta: "El mensaje hace una pregunta o solicita información.",
          pedido: "El mensaje realiza una solicitud o pedido concreto.",
          queja: "El mensaje expresa una queja o disconformidad.",
          spam:
            "El mensaje parece spam, publicidad no solicitada o contenido malicioso.",
          otro: "El mensaje no encaja en las categorías anteriores.",
        },
      ),
      urgent_reply: noul(
        "¿`message` solicita una respuesta urgente o inmediata?",
      ),
      anger: score(
        "¿Qué nivel de enojo o agresividad muestra `message`?",
        [
          "Calmo / neutro profesional",
          "Molesto leve (impaciencia sin insultos)",
          "Frustrado claro (queja fuerte, tono elevado)",
          "Enojado / agresivo (amenazas, insultos, «voy a…»)",
        ],
      ),
    },
  });

  const { answers } = response;

  const judgments: Judgments = {
    intent: {
      choice: answers.intent.choice,
      probabilities: answers.intent.probabilities as Record<string, number>,
      confidence: answers.intent.confidence,
    },
    urgent_reply: {
      noul: answers.urgent_reply.noul,
    },
    anger: {
      score: answers.anger.score,
      legend: answers.anger.legend as Record<string, string>,
      probabilities: answers.anger.probabilities as Record<string, number>,
      confidence: answers.anger.confidence,
    },
  };

  const decision = applyPolicy(judgments);

  const result: TriageResponse = { judgments, decision };
  return NextResponse.json(result);
}
