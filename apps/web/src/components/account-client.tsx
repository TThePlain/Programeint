"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";

type ExportPayload = {
  exportedAt: string;
  policy: string;
  user: { email: string; name: string };
};

export function AccountClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  async function doExport() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const data = await api<ExportPayload>("/api/account/export");
      setExportJson(JSON.stringify(data, null, 2));
      setMessage(`Exportação gerada em ${new Date(data.exportedAt).toLocaleString("pt-BR")}.`);
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao exportar.");
    } finally {
      setPending(false);
    }
  }

  async function doDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const result = await api<{ message: string }>("/api/account", {
        method: "DELETE",
        body: JSON.stringify({ password, confirm }),
      });
      setMessage(result.message);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao apagar.");
      setPending(false);
    }
  }

  return (
    <div className="account-page__panels">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="alert" role="status">
          {message}
        </p>
      ) : null}

      <article className="account-page__panel">
        <header className="account-page__panel-head">
          <p className="account-page__panel-label">Dados</p>
          <h2>Exportar</h2>
        </header>
        <p className="muted account-page__panel-copy">
          JSON com objectivo, preferências, domínio, portfólio e agenda. Senhas e tokens nunca
          entram.
        </p>
        <button className="btn btn-primary" type="button" disabled={pending} onClick={doExport}>
          Gerar exportação
        </button>
        {exportJson ? (
          <pre className="account-page__export code-block" tabIndex={0}>
            {exportJson}
          </pre>
        ) : null}
      </article>

      <article className="account-page__panel account-page__panel--danger">
        <header className="account-page__panel-head">
          <p className="account-page__panel-label">Zona perigosa</p>
          <h2>Apagar conta</h2>
        </header>
        <p className="muted account-page__panel-copy">
          Irreversível. Apaga o utilizador e os dados associados. Escreve{" "}
          <strong>APAGAR</strong> e confirma a senha.
        </p>
        <form className="account-page__delete" onSubmit={doDelete}>
          <label className="field">
            <span>Senha actual</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Confirmação</span>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="APAGAR"
              required
            />
          </label>
          <button className="btn account-page__delete-btn" type="submit" disabled={pending}>
            Apagar permanentemente
          </button>
        </form>
      </article>
    </div>
  );
}
