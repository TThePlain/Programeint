"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ApiError, api } from "@/lib/api";
import type { CalendarEvent, DueReview } from "@/lib/calendar";

const STATUS_LABEL: Record<string, string> = {
  planned: "Planeada",
  completed: "Concluída",
  cancelled: "Cancelada",
  missed: "Perdida",
};

type Props = {
  initialEvents: CalendarEvent[];
  dueReviews: DueReview[];
  preferences: { weeklyHours: number; sessionMinutes: number } | null;
  policy: string;
};

function nextMondayAt(hour: number) {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 1 && now.getHours() < hour ? 0 : daysUntilMonday));
  monday.setHours(hour, 0, 0, 0);
  return monday;
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AgendaClient({ initialEvents, dueReviews, preferences, policy }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("Sessão de estudo");
  const [durationMinutes, setDurationMinutes] = useState(preferences?.sessionMinutes ?? 45);
  const [startsLocal, setStartsLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [startHour, setStartHour] = useState(18);
  const [dailyHours, setDailyHours] = useState(1);
  const [schedulePreview, setSchedulePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const startsAt = new Date(startsLocal).toISOString();
      const created = await api<CalendarEvent>("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          kind: "study",
          startsAt,
          durationMinutes,
          href: "/app",
        }),
      });
      setEvents((prev) => [...prev, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setMessage("Sessão agendada.");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao agendar.");
    }
  }

  async function planWeek() {
    setError(null);
    setMessage(null);
    try {
      const firstSlot = nextMondayAt(18).toISOString();
      const result = await api<{ created: CalendarEvent[]; message: string }>("/api/calendar/plan-week", {
        method: "POST",
        body: JSON.stringify({ firstSlot }),
      });
      if (result.created.length > 0) {
        setEvents((prev) =>
          [...prev, ...result.created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
        );
      }
      setMessage(result.message);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao planear.");
    }
  }

  async function complete(id: string) {
    setError(null);
    setMessage(null);
    const focusedMinutes =
      activeId === id && elapsedSec > 0 ? Math.max(1, Math.round(elapsedSec / 60)) : undefined;
    try {
      const updated = await api<CalendarEvent>(`/api/calendar/events/${id}/complete`, {
        method: "POST",
        body: JSON.stringify(focusedMinutes ? { focusedMinutes } : {}),
      });
      setEvents((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (activeId === id) {
        setRunning(false);
        setActiveId(null);
        setElapsedSec(0);
      }
      setMessage(
        focusedMinutes
          ? `Sessão concluída com ${focusedMinutes} min focados.`
          : "Sessão marcada como concluída.",
      );
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao concluir.");
    }
  }

  async function cancel(id: string) {
    setError(null);
    setMessage(null);
    try {
      await api(`/api/calendar/events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((item) => item.id !== id));
      setMessage("Sessão cancelada.");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao cancelar.");
    }
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSchedulePreview(null);
    try {
      const start = new Date(`${startDate}T${String(startHour).padStart(2, "0")}:00:00`);
      const data = await api<{
        message: string;
        daysCount: number;
        finishAt: string | null;
        created: CalendarEvent[];
      }>("/api/calendar/schedule", {
        method: "POST",
        body: JSON.stringify({
          startAt: start.toISOString(),
          dailyMinutes: Math.round(dailyHours * 60),
        }),
      });
      setMessage(data.message);
      if (data.finishAt) {
        setSchedulePreview(
          `Terminas por volta de ${new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date(data.finishAt))} (${data.daysCount} dia(s) de estudo).`,
        );
      }
      setEvents((prev) => {
        const kept = prev.filter((ev) => !(ev.source === "plan" && ev.notes?.startsWith("schedule:")));
        return [...kept, ...data.created].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
      });
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao criar cronograma.",
      );
    }
  }

  function startFocus(id: string) {
    setActiveId(id);
    setElapsedSec(0);
    setRunning(true);
    setMessage("Foco iniciado. Ao concluir, os minutos focados são gravados.");
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="stack agenda-calm">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="alert alert-ok" role="status">
          {message}
        </p>
      ) : null}

      <article className="today-focus">
        <p className="today-focus__eyebrow">Cronograma da matéria</p>
        <h2 className="today-focus__title">Quando comesças e quanto estudas</h2>
        <p className="today-focus__msg">
          Indica o dia de início e as horas por dia. A plataforma calcula as datas de cada etapa do
          mapa até acabares — sem misturar outros objectivos.
        </p>
        {preferences ? (
          <p className="muted">
            Cada sessão no mapa usa {preferences.sessionMinutes} min (do teu onboarding).
          </p>
        ) : (
          <p className="alert alert-error" role="status">
            Completa o onboarding para gerar o cronograma.
          </p>
        )}
        <form className="stack schedule-form" onSubmit={(ev) => void createSchedule(ev)}>
          <div className="schedule-form__row">
            <label>
              Dia de início
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label>
              Hora típica
              <input
                type="number"
                min={6}
                max={22}
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                required
              />
            </label>
            <label>
              Horas por dia
              <input
                type="number"
                min={0.25}
                max={8}
                step={0.25}
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                required
              />
            </label>
          </div>
          <p className="nav">
            <button className="btn btn-primary" type="submit" disabled={pending || !preferences}>
              Calcular cronograma
            </button>
          </p>
        </form>
        {schedulePreview ? <p className="now">{schedulePreview}</p> : null}
      </article>

      <details className="study-home__more">
        <summary>Sessão avulsa / planear só uma semana</summary>
        <div className="stack study-home__more-body">
          <form className="stack" onSubmit={createEvent}>
            <label>
              Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
            </label>
            <label>
              Início
              <input
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                required
              />
            </label>
            <label>
              Duração (minutos)
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </label>
            <p className="nav">
              <button className="btn btn-primary" type="submit" disabled={pending}>
                Agendar sessão
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={pending || !preferences}
                onClick={planWeek}
              >
                Planear semana genérica
              </button>
            </p>
          </form>
        </div>
      </details>

      {activeId ? (
        <article className="today-focus" aria-live="polite">
          <h2 className="today-focus__title">Foco</h2>
          <p className="now">
            <strong>
              {mm}:{ss}
            </strong>
          </p>
          <p className="nav">
            <button className="btn btn-ghost" type="button" onClick={() => setRunning((r) => !r)}>
              {running ? "Pausar" : "Continuar"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => complete(activeId)}>
              Concluir e gravar foco
            </button>
          </p>
        </article>
      ) : null}

      <article className="stack agenda-list">
        <h2>O que vais estudar (datas)</h2>
        <p className="muted">Lista gerada pelo cronograma e sessões tuas. Abre a etapa do dia.</p>
        {events.length === 0 ? (
          <p role="status">Ainda sem datas. Cria o cronograma acima.</p>
        ) : (
          <ul className="agenda-timeline">
            {events.map((event) => (
              <li key={event.id} className="agenda-timeline__item">
                <div>
                  <strong>{event.title}</strong>
                  <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                    {formatWhen(event.startsAt)} · {event.durationMinutes} min ·{" "}
                    {STATUS_LABEL[event.status] ?? event.status}
                  </p>
                </div>
                {event.status === "planned" || event.status === "missed" ? (
                  <p className="nav" style={{ margin: 0 }}>
                    {event.href ? (
                      <a className="btn btn-primary" href={event.href}>
                        Estudar
                      </a>
                    ) : null}
                    <button className="btn btn-ghost" type="button" onClick={() => complete(event.id)}>
                      Concluir
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => cancel(event.id)}>
                      Cancelar
                    </button>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>

      {dueReviews.length > 0 ? (
        <details className="study-home__more">
          <summary>Revisões FSRS devidas ({dueReviews.length})</summary>
          <ul className="node-list">
            {dueReviews.map((item) => (
              <li key={item.cardId} className="node-item">
                <h3>{item.nodeTitle}</h3>
                <p className="muted">Devida em {formatWhen(item.due)}</p>
                <a className="btn btn-ghost" href={item.href}>
                  Revisar
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
