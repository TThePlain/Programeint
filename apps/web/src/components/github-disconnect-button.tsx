"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api";

export function GithubDisconnectButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setPending(true);
    setError(null);
    try {
      await api("/api/github", { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível desligar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-ghost" type="button" onClick={() => void disconnect()} disabled={pending}>
        {pending ? "A desligar…" : "Desligar GitHub"}
      </button>
    </div>
  );
}
