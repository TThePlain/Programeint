import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type CalendarEvent = {
  id: string;
  kind: string;
  title: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: string;
  source: string;
  focusedMinutes: number | null;
  notes: string | null;
  href: string | null;
  completedAt: string | null;
};

export type DueReview = {
  cardId: string;
  due: string;
  nodeSlug: string;
  nodeTitle: string;
  href: string;
  source: "fsrs";
};

export type CalendarView = {
  from: string;
  to: string;
  preferences: { weeklyHours: number; sessionMinutes: number } | null;
  events: CalendarEvent[];
  dueReviews: DueReview[];
  policy: string;
};

export async function getCalendar(from?: string, to?: string): Promise<CalendarView | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params}` : "";

  try {
    const response = await fetch(`${API}/api/calendar${query}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as CalendarView;
  } catch {
    return null;
  }
}

export type TodaySchedule = {
  available: boolean;
  date: string;
  dayIndex?: number;
  goal: { id: string; statement: string } | null;
  preferences: { weeklyHours: number; sessionMinutes: number } | null;
  hasSchedule: boolean;
  items: CalendarEvent[];
  focus: {
    title: string;
    href: string;
    status: string;
    startsAt: string;
    durationMinutes: number;
  } | null;
  remainingToday: number;
  totalRemaining?: number;
  finishAt: string | null;
  message: string;
};

export async function getTodaySchedule(): Promise<TodaySchedule | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(`${API}/api/calendar/today`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as TodaySchedule;
  } catch {
    return null;
  }
}
