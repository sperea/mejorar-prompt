import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import type { ChatMessage, OrchestratorResponse } from "@/lib/types";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function isValidOrchestratorResponse(value: unknown): value is OrchestratorResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.fase === "preguntas" ||
      v.fase === "finalizado" ||
      v.fase === "finalizado_con_advertencia") &&
    typeof v.contenido === "string" &&
    typeof v.progreso === "number" &&
    typeof v.ronda_actual === "number"
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY no configurada en el servidor." },
      { status: 500 }
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages vacío o inválido");
    }
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar con DeepSeek." },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `DeepSeek respondió ${upstream.status}: ${text}` },
      { status: 502 }
    );
  }

  const data = await upstream.json();
  const raw: string | undefined = data?.choices?.[0]?.message?.content;

  if (!raw) {
    return NextResponse.json(
      { error: "Respuesta de DeepSeek sin contenido." },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "DeepSeek no devolvió JSON válido.", raw },
      { status: 502 }
    );
  }

  if (!isValidOrchestratorResponse(parsed)) {
    return NextResponse.json(
      { error: "JSON de DeepSeek no cumple el esquema esperado.", raw },
      { status: 502 }
    );
  }

  return NextResponse.json({ result: parsed, raw });
}
