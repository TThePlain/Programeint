import Link from "next/link";
import type { TodaySchedule } from "@/lib/calendar";

function formatFinish(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Foco calmo do dia: o que estudar agora, sem ruído.
 */
export function TodayFocus({
  today,
  nextHref,
  nextLabel,
}: {
  today: TodaySchedule | null;
  nextHref?: string;
  nextLabel?: string;
}) {
  const finish = formatFinish(today?.finishAt ?? null);
  const href = today?.focus?.href ?? nextHref ?? "/agenda";
  const cta =
    today?.focus && today.focus.status !== "completed"
      ? "Estudar agora"
      : today?.hasSchedule
        ? "Ver agenda"
        : "Criar cronograma";

  return (
    <section className="today-focus">
      <p className="today-focus__eyebrow">Hoje</p>
      <h2 className="today-focus__title">
        {today?.focus?.title ?? (today?.hasSchedule ? "Sem etapa para hoje" : "Sem cronograma")}
      </h2>
      <p className="today-focus__msg">{today?.message ?? "A carregar o plano do dia…"}</p>
      {today?.goal ? (
        <p className="today-focus__goal muted">Objectivo: {today.goal.statement}</p>
      ) : null}
      {finish && today?.hasSchedule ? (
        <p className="muted today-focus__meta">
          Previsão de concluir a matéria: <strong>{finish}</strong>
          {typeof today.totalRemaining === "number"
            ? ` · ${today.totalRemaining} etapa(s) por fazer`
            : ""}
        </p>
      ) : null}
      <p className="nav today-focus__actions">
        <Link className="btn btn-primary" href={today?.hasSchedule && today.focus ? href : "/agenda"}>
          {cta}
          <span aria-hidden="true">→</span>
        </Link>
        {nextHref && today?.hasSchedule ? (
          <Link className="btn btn-ghost" href={nextHref}>
            {nextLabel ?? "Outro passo"}
          </Link>
        ) : null}
      </p>
    </section>
  );
}
