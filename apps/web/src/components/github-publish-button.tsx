"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/api";

type PublishResult = {
  message: string;
  url: string;
  repo: string;
};

export function GithubPublishButton({ disabled }: { disabled?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [pending, setPending] = useState(false);

  async function publish() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const data = await api<PublishResult>("/api/github/publish-evidence", { method: "POST" });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao publicar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <button className="btn btn-primary" type="button" disabled={pending || disabled} onClick={publish}>
        {pending ? "A publicar…" : "Publicar evidência no GitHub"}
      </button>
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <p className="alert" role="status">
          {result.message}{" "}
          <a href={result.url} target="_blank" rel="noreferrer noopener">
            Abrir {result.repo}
          </a>
        </p>
      ) : null}
    </div>
  );
}
