"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABEL } from "@programeint/shared";
import { TechMark } from "@/components/tech-mark";
import { ApiError, api } from "@/lib/api";

export type GoalListItem = {
  id: string;
  statement: string;
  isCurrent: boolean;
  primaryTarget: { slug: string; label: string } | null;
  curriculumStatus?: string;
  curriculumNote?: string | null;
};

type Props = {
  initialGoals?: GoalListItem[];
};

export function GoalSwitcher({ initialGoals }: Props) {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalListItem[]>(initialGoals ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatement, setEditStatement] = useState("");
  const [editLevel, setEditLevel] = useState<(typeof EXPERIENCE_LEVELS)[number] | "">("");

  useEffect(() => {
    if (initialGoals && initialGoals.length > 0) {
      setGoals(initialGoals);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<{ items: GoalListItem[] }>("/api/goals");
        if (!cancelled) setGoals(data.items);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialGoals]);

  async function activate(id: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/goals/${id}/activate`, { method: "POST", body: "{}" });
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível trocar de objectivo.");
      setPending(false);
    }
  }

  async function remove(id: string, label: string) {
    if (pending) return;
    const ok = window.confirm(
      `Apagar o objectivo «${label}» e o respectivo mapa (vídeos, texto, diagnóstico)? Esta acção não se desfaz.`,
    );
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/goals/${id}`, { method: "DELETE" });
      window.location.href = "/mapa";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível apagar o objectivo.");
      setPending(false);
    }
  }

  async function regenerate(id: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/goals/${id}/regenerate`, { method: "POST", body: "{}" });
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível regenerar o mapa.");
      setPending(false);
    }
  }

  function startEdit(goal: GoalListItem) {
    setEditingId(goal.id);
    setEditStatement(goal.statement);
    setEditLevel("");
    setError(null);
  }

  async function saveEdit(event: FormEvent, goal: GoalListItem) {
    event.preventDefault();
    if (pending) return;
    const statement = editStatement.trim();
    if (statement.length < 8) {
      setError("O objectivo precisa de pelo menos 8 caracteres.");
      return;
    }
    const statementChanged = statement !== goal.statement.trim();
    let regenerateMap = false;
    if (statementChanged) {
      regenerateMap = window.confirm(
        "Alteraste o objectivo. Queres regenerar o mapa (pesquisa + módulos) para este texto? O mapa antigo deste objectivo será substituído.",
      );
    }
    setPending(true);
    setError(null);
    try {
      await api(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          statement,
          ...(editLevel ? { experienceLevel: editLevel } : {}),
          regenerate: regenerateMap,
        }),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível actualizar o objectivo.");
      setPending(false);
    }
  }

  if (goals.length === 0) {
    return (
      <p className="nav" style={{ marginTop: 8 }}>
        <a className="btn btn-primary" href="/onboarding">
          Definir objectivo
        </a>
      </p>
    );
  }

  return (
    <div className="goal-switcher stack">
      <p className="muted" style={{ margin: 0 }}>
        Escolhe na lista qual objectivo fica em foco (mapa, vídeos e evolução ficam separados):
      </p>
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="goal-switcher__list">
        {goals.map((goal) => (
          <li key={goal.id} className="goal-switcher__row">
            {editingId === goal.id ? (
              <form className="stack goal-switcher__edit" onSubmit={(e) => void saveEdit(e, goal)}>
                <label>
                  Objectivo
                  <textarea
                    rows={3}
                    value={editStatement}
                    onChange={(event) => setEditStatement(event.target.value)}
                    required
                    minLength={8}
                    maxLength={280}
                  />
                </label>
                <label>
                  Nível (opcional — actualiza as preferências)
                  <select
                    value={editLevel}
                    onChange={(event) =>
                      setEditLevel(event.target.value as (typeof EXPERIENCE_LEVELS)[number] | "")
                    }
                  >
                    <option value="">Manter nível actual</option>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {EXPERIENCE_LEVEL_LABEL[level]}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="nav">
                  <button className="btn btn-primary" type="submit" disabled={pending}>
                    {pending ? "A gravar…" : "Guardar objectivo"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </button>
                </p>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className={`goal-switcher__item${goal.isCurrent ? " is-current" : ""}`}
                  disabled={pending || goal.isCurrent}
                  onClick={() => void activate(goal.id)}
                >
                  <TechMark
                    slug={goal.primaryTarget?.slug}
                    label={goal.primaryTarget?.label}
                    statement={goal.statement}
                    size={56}
                    className="goal-switcher__mark"
                  />
                  <span className="goal-switcher__text">
                    <span className="goal-switcher__label">
                      {goal.primaryTarget?.label ?? "Objectivo"}
                      {goal.isCurrent ? " · em foco" : ""}
                      {goal.curriculumStatus === "generating" ? " · a gerar mapa…" : ""}
                      {goal.curriculumStatus === "failed" ? " · mapa falhou" : ""}
                    </span>
                    <span className="goal-switcher__statement">{goal.statement}</span>
                  </span>
                </button>
                <span className="goal-switcher__actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={() => startEdit(goal)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending || goal.curriculumStatus === "generating"}
                    onClick={() => void regenerate(goal.id)}
                  >
                    {goal.curriculumStatus === "generating" ? "A gerar…" : "Regenerar mapa"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={() =>
                      void remove(goal.id, goal.primaryTarget?.label ?? goal.statement.slice(0, 40))
                    }
                  >
                    Apagar
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="nav">
        <a className="btn btn-ghost" href="/onboarding" onClick={() => router.push("/onboarding")}>
          Adicionar objectivo
        </a>
        <a className="btn btn-ghost" href="/objectivos" onClick={() => router.push("/objectivos")}>
          Ver todos
        </a>
      </p>
    </div>
  );
}
