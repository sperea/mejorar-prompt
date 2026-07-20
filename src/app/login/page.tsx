"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Fallo de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-center text-black dark:text-zinc-50">
          Acceso restringido
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && entrar()}
          placeholder="Contraseña"
          autoFocus
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={entrar}
          disabled={loading || !password}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Comprobando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
