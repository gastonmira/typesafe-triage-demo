# TypeSafe Triage Demo

Demo público en Next.js: texto libre → una llamada a **TypeSafe `systemOne`** → UI muestra en paralelo **(A) juicios del modelo** vs **(B) decisión de política en código**. En menos de un minuto podés ver qué hizo el modelo y qué hizo el código.

## ¿Qué hace?

1. El visitante escribe (o elige) un mensaje de ejemplo.
2. El servidor llama **una sola vez** a `client.systemOne(...)` con tres preguntas:
   - **Choice `intent`**: pregunta | pedido | queja | spam | otro (+ probabilidades + confianza)
   - **Noul `urgent_reply`**: ¿pide respuesta urgente? (probabilidad 0–1)
   - **Score `anger`**: nivel de enojo en 4 niveles (1 = calmo → 4 = agresivo)
3. El código aplica la **política fija** ([`src/lib/policy.ts`](src/lib/policy.ts)) y retorna una decisión con el nombre de la regla que se disparó.
4. La UI muestra ambos paneles lado a lado.

## Modelo vs Código

| | TypeSafe (modelo) | Código (política) |
|---|---|---|
| **Qué hace** | Evalúa semántica; devuelve probabilidades calibradas | Aplica umbrales fijos sobre esas probabilidades |
| **Cuándo cambia** | Con re-entrenamiento del modelo | Con un edit en `policy.ts` |
| **Output** | `choice`, `noul`, `score` con sus distribuciones | Una de cuatro etiquetas + id de regla |

## Política de código y umbrales

Ver [`src/lib/policy.ts`](src/lib/policy.ts). Orden de evaluación (primera coincidencia gana):

| # | Condición | Decisión | Regla id |
|---|---|---|---|
| 1 | `intent === "spam"` | **archivar** | `spam→archivar` |
| 2 | `urgent_reply.noul ≥ 0.5` **AND** `intent.confidence ≥ 0.75` | **avisar ahora** | `urgent+conf≥0.75→avisar ahora` |
| 3 | `intent.confidence < 0.55` | **revisar a mano** | `conf<0.55→revisar a mano` |
| 4 | (default) | **cola normal** | `default→cola normal` |

> **Nota sobre Noul**: no tiene `confidence`; el criterio de urgencia es directamente `noul ≥ 0.5`. La puerta de confianza aplica solo al `Choice`.

## Ejecutar localmente

### Requisitos
- Node.js ≥ 20
- Una API key de TypeSafe ([console.typesafe.ai](https://console.typesafe.ai))

### Pasos

```bash
git clone https://github.com/gastonmira/typesafe-triage-demo.git
cd typesafe-triage-demo
npm install

# Crear .env.local con la API key (NUNCA con prefijo NEXT_PUBLIC_)
echo "TYPESAFE_API_KEY=ts-..." > .env.local

npm run dev
# → http://localhost:3000
```

### Tests

```bash
npm test
```

## La API key nunca llega al cliente

- La variable de entorno se llama **`TYPESAFE_API_KEY`** (sin prefijo `NEXT_PUBLIC_`).
- Next.js solo expone al cliente las variables que empiezan con `NEXT_PUBLIC_`.
- Toda la lógica de TypeSafe vive en la [Route Handler](src/app/api/triage/route.ts) que corre **únicamente en servidor**.
- El cliente solo llama a `/api/triage` con `{ text }` y recibe `{ judgments, decision }`.

## Deploy en Vercel

1. Conectar el repo en [vercel.com](https://vercel.com).
2. Agregar la variable de entorno en **Project → Settings → Environment Variables**:
   - Nombre: `TYPESAFE_API_KEY`
   - Valor: tu API key
   - Environments: Production, Preview, Development
3. Hacer deploy. Sin esa variable el endpoint retorna 500 con un mensaje genérico (sin filtrar la key).

## QA path

1. Abrí la app.
2. Probá el chip **"Ganá $5000/día…"** → debe decidir **archivar** con regla `spam→archivar`.
3. Probá **"Necesito que me reembolsen YA…"** → debería disparar **avisar ahora** o **cola normal** según la confianza.
4. Ingresá texto muy ambiguo (una frase corta sin contexto) → puede disparar **revisar a mano**.
5. Abrí DevTools → Network → Response del POST `/api/triage` → confirmá que `TYPESAFE_API_KEY` no aparece en ningún lugar del response.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [TypeSafe AI SDK](https://docs.typesafe.ai/sdk/javascript.md) (`@typesafe-ai/sdk`)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Jest](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/)
