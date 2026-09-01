"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type GoalStatus = {
  id: string;
  curriculumStatus?: string;
};

/**
 * Enquanto o mapa está a gerar, consulta o onboarding e refresca a página quando fica ready/failed.
 */
export function CurriculumReadyPoller({
  goalId,
  active = true,
  intervalMs = 2500,
}: {
  goalId?: string | null;
  active?: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    if (!active || !goalId) return;
    let cancelled = false;

    async function tick() {
      try {
        const data = await api<{
          goal: GoalStatus | null;
          goals?: GoalStatus[];
        }>("/api/onboarding");
        if (cancelled) return;
        const goal =
          data.goals?.find((g) => g.id === goalId) ??
          (data.goal?.id === goalId ? data.goal : null);
        const status = goal?.curriculumStatus;
        if (status === "ready" || status === "failed") {
          router.refresh();
          return;
        }
        setTicks((n) => n + 1);
      } catch {
        /* tenta de novo no próximo intervalo */
      }
    }

    void tick();
    const id = window.setInterval(() => {
      if (Date.now() - started.current > 180_000) {
        window.clearInterval(id);
        return;
      }
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, goalId, intervalMs, router]);

  if (!active) return null;

  return (
    <p className="muted" role="status" aria-live="polite">
      A pesquisar e montar o mapa deste objectivo
      {ticks > 0 ? `… (${Math.min(ticks * Math.round(intervalMs / 1000), 180)}s)` : "…"}
      . Esta página actualiza sozinha quando estiver pronto.
    </p>
  );
}
