"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABEL,
  GOAL_CATALOG,
  GOAL_FAMILY_LABEL,
  SESSION_MINUTES,
  STUDY_PROGRAM_STAGES,
  onboardingSchema,
  type ExperienceLevel,
  type GoalSlug,
} from "@programeint/shared";
import { ApiError, api } from "@/lib/api";
import { GoalBanner, TechMark } from "@/components/tech-mark";
import type { OnboardingState } from "@/lib/onboarding";

type Props = { initial: OnboardingState | null };

const FAMILIES = [
  "programacao",
  "stacks",
  "fundamentos",
  "ferramentas",
  "tech",
  "custom",
] as const;

export function OnboardingWizard({ initial }: Props) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [statement, setStatement] = useState(initial?.goal?.statement ?? "");
  const [primaryTarget, setPrimaryTarget] = useState<GoalSlug | "">(
    (initial?.goal?.primaryTarget?.slug as GoalSlug | undefined) ?? "java",
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">(
    (initial?.preferences?.experienceLevel as ExperienceLevel | undefined) ?? "",
  );
  const [weeklyHours, setWeeklyHours] = useState(initial?.preferences?.weeklyHours ?? 5);
  const [sessionMinutes, setSessionMinutes] = useState<(typeof SESSION_MINUTES)[number]>(
    (initial?.preferences?.sessionMinutes as (typeof SESSION_MINUTES)[number] | undefined) ?? 45,
  );
  const [prefersVideo, setPrefersVideo] = useState(initial?.preferences?.prefersVideo ?? true);
  const [prefersReading, setPrefersReading] = useState(initial?.preferences?.prefersReading ?? true);
  const [prefersPractice, setPrefersPractice] = useState(initial?.preferences?.prefersPractice ?? true);

  const byFamily = useMemo(() => {
    const map = new Map<string, Array<{ slug: GoalSlug; label: string; family: string }>>();
    for (const family of FAMILIES) {
      const items = GOAL_CATALOG.filter((item) => item.family === family);
      if (items.length) map.set(family, [...items]);
    }
    return map;
  }, []);

  function goNext() {
    setError(null);
    if (step === 1 && (statement.trim().length < 8 || !primaryTarget)) {
      setError("Descreve o objectivo e escolhe uma área (ou Outro).");
      return;
    }
    if (step === 1 && primaryTarget === "custom" && statement.trim().length < 12) {
      setError("Para um objectivo personalizado, descreve-o com mais detalhe.");
      return;
    }
    if (step === 2 && !experienceLevel) {
      setError("Indica o teu nível neste objectivo.");
      return;
    }
    if (step === 3 && (weeklyHours < 1 || weeklyHours > 40)) {
      setError("Indica entre 1 e 40 horas por semana.");
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = onboardingSchema.safeParse({
      statement,
      primaryTarget,
      experienceLevel,
      knownTopics: (initial?.preferences?.knownTopics as GoalSlug[] | undefined) ?? [],
      weeklyHours: Number(weeklyHours),
      sessionMinutes,
      prefersVideo,
      prefersReading,
      prefersPractice,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      setError(first ?? "Revisa os dados do onboarding.");
      return;
    }
    setPending(true);
    try {
      await api("/api/onboarding", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      window.location.assign("/mapa");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível gravar o objectivo / gerar o programa.",
      );
      setPending(false);
    }
  }

  return (
    <form className="stack study-onboarding" onSubmit={onSubmit}>
      <header className="stack" style={{ gap: "0.35rem" }}>
        <p className="muted" style={{ margin: 0 }}>
          Programa de tecnologia e programação
        </p>
        <h1 style={{ margin: 0 }}>Objectivo → nível → materiais</h1>
        <p className="muted">
          Passo {step} de 4 · Mapa, labs e biblioteca ficam só deste objectivo tech.
        </p>
      </header>

      <ol className="study-flow" aria-label="Fluxo">
        <li className={step >= 1 ? "is-active" : ""}>1. Objectivo</li>
        <li className={step >= 2 ? "is-active" : ""}>2. Nível</li>
        <li className={step >= 3 ? "is-active" : ""}>3. Ritmo</li>
        <li className={step >= 4 ? "is-active" : ""}>4. Materiais</li>
      </ol>

      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <fieldset className="stack">
          <legend>1. O teu objectivo tech</legend>
          <label>
            O que queres aprender em tecnologia / programação?
            <textarea
              name="statement"
              rows={3}
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
              placeholder="Ex.: Quero aprender Java para backend; React com TypeScript; Docker e DevOps…"
              required
            />
          </label>
          <p className="muted">
            Ao gravar, o sistema pesquisa e gera um programa só para esta tecnologia: fundamentos →
            conceitos → ferramentas → prática → padrões → projecto → fecho.
          </p>
          <h2 className="onboarding-catalog__title">Escolhe na lista</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Linguagens, stacks e áreas — toca numa opção (com o ícone da tecnologia).
          </p>
          {[...byFamily.entries()].map(([family, items]) => (
            <fieldset key={family} className="onboarding-catalog__family">
              <legend>{GOAL_FAMILY_LABEL[family] ?? family}</legend>
              {family === "programacao" ? (
                <p className="muted">
                  Em carreiras de programação o mapa pode incluir framework (ex. Java → Spring
                  Boot), full-stack, soft skills e como é o trabalho — não só sintaxe.
                </p>
              ) : null}
              <div className="choice-grid choice-grid--tech" role="listbox" aria-label={GOAL_FAMILY_LABEL[family] ?? family}>
                {items.map((item) => (
                  <label
                    key={item.slug}
                    className={`choice choice--tech${primaryTarget === item.slug ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="primaryTarget"
                      value={item.slug}
                      checked={primaryTarget === item.slug}
                      onChange={() => {
                        setPrimaryTarget(item.slug);
                        if (item.slug !== "custom" && statement.trim().length < 8) {
                          setStatement(`Quero aprender ${item.label}.`);
                        }
                      }}
                    />
                    <TechMark slug={item.slug} label={item.label} size={48} />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {primaryTarget && statement.trim().length >= 8 ? (
            <GoalBanner
              statement={statement.trim()}
              targetSlug={primaryTarget}
              targetLabel={GOAL_CATALOG.find((g) => g.slug === primaryTarget)?.label}
              eyebrow="Pré-visualização do objectivo"
              compact
            />
          ) : null}
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset className="stack">
          <legend>2. Nível neste objectivo</legend>
          <p className="muted">
            Auto-relato para adaptar o programa. O diagnóstico depois mede evidência real — não
            substitui isto.
          </p>
          {EXPERIENCE_LEVELS.map((level) => (
            <label key={level} className="choice">
              <input
                type="radio"
                name="experienceLevel"
                value={level}
                checked={experienceLevel === level}
                onChange={() => setExperienceLevel(level)}
              />
              {EXPERIENCE_LEVEL_LABEL[level]}
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset className="stack">
          <legend>3. Ritmo de estudo</legend>
          <label>
            Horas por semana
            <input
              type="number"
              min={1}
              max={40}
              name="weeklyHours"
              value={weeklyHours}
              onChange={(event) => setWeeklyHours(Number(event.target.value))}
            />
          </label>
          <fieldset>
            <legend>Duração típica de uma sessão</legend>
            <div className="choice-grid">
              {SESSION_MINUTES.map((minutes) => (
                <label key={minutes} className="choice">
                  <input
                    type="radio"
                    name="sessionMinutes"
                    value={minutes}
                    checked={sessionMinutes === minutes}
                    onChange={() => setSessionMinutes(minutes)}
                  />
                  {minutes} min
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset className="stack">
          <legend>4. Como preferes estudar</legend>
          <p className="muted">
            Escolhe pelo menos um. O programa usa isto para priorizar vídeo, leitura ou prática —
            sempre sobre o mesmo objectivo.
          </p>
          <label className="choice">
            <input
              type="checkbox"
              checked={prefersVideo}
              onChange={(event) => setPrefersVideo(event.target.checked)}
            />
            Vídeo (acompanhar o mapa)
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={prefersReading}
              onChange={(event) => setPrefersReading(event.target.checked)}
            />
            Leitura / documentos (biblioteca do objectivo)
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={prefersPractice}
              onChange={(event) => setPrefersPractice(event.target.checked)}
            />
            Prática (exercícios, exemplos, projecto)
          </label>

          <div className="now">
            <strong>Programa que vamos gerar:</strong>
            <ul>
              {STUDY_PROGRAM_STAGES.map((s) => (
                <li key={s.key}>
                  {s.label} — {s.role}
                </li>
              ))}
            </ul>
          </div>
        </fieldset>
      ) : null}

      <div className="nav">
        {step > 1 ? (
          <button className="btn btn-ghost" type="button" onClick={() => setStep((c) => c - 1)}>
            Voltar
          </button>
        ) : null}
        {step < 4 ? (
          <button className="btn btn-primary" type="button" onClick={goNext}>
            Continuar
          </button>
        ) : (
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "A pesquisar e gerar o programa…" : "Gerar programa deste objectivo"}
          </button>
        )}
      </div>
    </form>
  );
}
