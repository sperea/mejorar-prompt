"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, Fase } from "@/lib/types";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

const FORMATO_OPCIONES = [
  { value: "", label: "Sin preferencia" },
  { value: "Markdown estructurado con encabezados", label: "Markdown" },
  { value: "JSON con esquema definido", label: "JSON" },
  { value: "Tabla", label: "Tabla" },
  { value: "Lista", label: "Lista" },
  { value: "HTML", label: "HTML" },
  { value: "Texto narrativo", label: "Texto narrativo" },
];

const TONO_OPCIONES = [
  { value: "", label: "Sin preferencia" },
  { value: "Formal y técnico", label: "Formal / técnico" },
  { value: "Cercano y conversacional", label: "Cercano" },
  { value: "Creativo", label: "Creativo" },
  { value: "Neutro y directo", label: "Neutro" },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [apiHistory, setApiHistory] = useState<ChatMessage[]>([]);
  const [fase, setFase] = useState<Fase | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [rondaActual, setRondaActual] = useState(0);
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [advertencia, setAdvertencia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formato, setFormato] = useState("");
  const [tono, setTono] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, finalPrompt]);

  function construirMensajeInicial(idea: string) {
    const preferencias: string[] = [];
    if (formato) preferencias.push(`- Formato de salida deseado: ${formato}`);
    if (tono) preferencias.push(`- Tono y estilo: ${tono}`);
    if (restricciones.trim())
      preferencias.push(`- Restricciones y reglas: ${restricciones.trim()}`);

    if (preferencias.length === 0) return idea;
    return `${idea}\n\n[Preferencias adicionales indicadas por el usuario]\n${preferencias.join(
      "\n"
    )}`;
  }

  async function enviar() {
    const texto = input.trim();
    if (!texto || loading) return;

    const esPrimerTurno = turns.length === 0;
    const textoEnviado = esPrimerTurno
      ? construirMensajeInicial(texto)
      : texto;

    setError(null);
    setLoading(true);
    setInput("");

    setTurns((prev) => [...prev, { role: "user", text: texto }]);

    const nuevaHistoria: ChatMessage[] = [
      ...apiHistory,
      { role: "user", content: textoEnviado },
    ];

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nuevaHistoria }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error desconocido.");
        setTurns((prev) => prev.slice(0, -1));
        return;
      }

      const { fase: nuevaFase, contenido, progreso: nuevoProgreso, ronda_actual } =
        data.result;

      setApiHistory([
        ...nuevaHistoria,
        { role: "assistant", content: data.raw },
      ]);
      setFase(nuevaFase);
      setProgreso(nuevoProgreso);
      setRondaActual(ronda_actual);

      if (nuevaFase === "finalizado" || nuevaFase === "finalizado_con_advertencia") {
        setAdvertencia(nuevaFase === "finalizado_con_advertencia");
        setFinalPrompt(contenido);
      } else {
        setTurns((prev) => [...prev, { role: "assistant", text: contenido }]);
      }
    } catch {
      setError("Fallo de red al contactar con el orquestador.");
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function reiniciar() {
    setInput("");
    setTurns([]);
    setApiHistory([]);
    setFase(null);
    setProgreso(0);
    setRondaActual(0);
    setFinalPrompt(null);
    setAdvertencia(false);
    setError(null);
    setCopied(false);
    setFormato("");
    setTono("");
    setRestricciones("");
    setShowAdvanced(false);
  }

  async function copiar() {
    if (!finalPrompt) return;
    await navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <header className="relative text-center">
          <button
            onClick={() =>
              fetch("/api/logout", { method: "POST" }).then(
                () => (window.location.href = "/login")
              )
            }
            className="absolute right-0 top-0 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Salir
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Mejorar Prompt
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Orquestador guiado por DeepSeek: idea → preguntas → prompt cocinado.
          </p>
        </header>

        {!finalPrompt && (
          <div className="flex flex-col gap-4">
            {turns.map((t, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  t.role === "user"
                    ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 max-w-[85%]"
                    : "self-start bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-[85%]"
                }`}
              >
                {t.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {finalPrompt ? (
          <div className="flex flex-col gap-4">
            {advertencia && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 px-4 py-3 text-sm">
                ⚠️ Prompt generado con información parcial tras {rondaActual}{" "}
                rondas. Revisa las secciones marcadas.
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <PromptCocinado texto={finalPrompt} />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={copiar}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                {copied ? "Copiado ✓" : "Copiar prompt"}
              </button>
              <button
                onClick={reiniciar}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={turns.length === 0 ? 5 : 3}
              placeholder={
                turns.length === 0
                  ? "Describe tu idea inicial..."
                  : "Responde a la pregunta..."
              }
              className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />

            {turns.length === 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex justify-between items-center px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <span>Preferencias de formato, tono y restricciones (opcional)</span>
                  <span>{showAdvanced ? "▲" : "▼"}</span>
                </button>
                {showAdvanced && (
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    <label className="flex flex-col gap-1 text-xs text-zinc-500">
                      Formato de salida deseado
                      <select
                        value={formato}
                        onChange={(e) => setFormato(e.target.value)}
                        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      >
                        {FORMATO_OPCIONES.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-zinc-500">
                      Tono y estilo
                      <select
                        value={tono}
                        onChange={(e) => setTono(e.target.value)}
                        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      >
                        {TONO_OPCIONES.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-zinc-500">
                      Restricciones y reglas (qué NO debe hacer, límites, etc.)
                      <textarea
                        value={restricciones}
                        onChange={(e) => setRestricciones(e.target.value)}
                        rows={2}
                        placeholder="Ej: no usar tecnicismos, máximo 300 palabras, no mencionar precios..."
                        className="w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">
                {fase === "preguntas"
                  ? `Ronda ${rondaActual} · Progreso ${progreso}%`
                  : ""}
              </span>
              <button
                onClick={enviar}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                {loading
                  ? "Pensando..."
                  : turns.length === 0
                  ? "Optimizar prompt"
                  : "Enviar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptCocinado({ texto }: { texto: string }) {
  const lineas = texto.split("\n");
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {lineas.map((linea, i) => {
        const esCabecera = /^\s*●/.test(linea);
        return (
          <p
            key={i}
            className={
              esCabecera
                ? "font-semibold mt-3 first:mt-0 text-black dark:text-zinc-50"
                : "text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap"
            }
          >
            {linea}
          </p>
        );
      })}
    </div>
  );
}
