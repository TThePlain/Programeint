import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type OnboardingState = {
  complete: boolean;
  goal: {
    id: string;
    statement: string;
    status: string;
    isCurrent?: boolean;
    tipNodeSlug?: string | null;
    curriculumStatus?: string;
    curriculumSource?: string | null;
    curriculumNote?: string | null;
    primaryTarget: { slug: string; label: string } | null;
    targets: Array<{ slug: string; label: string; isPrimary: boolean }>;
    updatedAt: string;
  } | null;
  goals?: Array<{
    id: string;
    statement: string;
    status: string;
    isCurrent?: boolean;
    primaryTarget: { slug: string; label: string } | null;
    curriculumStatus?: string;
    curriculumNote?: string | null;
    updatedAt: string;
  }>;
  preferences: {
    experienceLevel: string;
    weeklyHours: number;
    sessionMinutes: number;
    prefersVideo: boolean;
    prefersReading: boolean;
    prefersPractice: boolean;
    knownTopics: string[];
    onboardingCompletedAt: string | null;
  } | null;
};

const emptyOnboarding = (): OnboardingState => ({
  complete: false,
  goal: null,
  preferences: null,
});

export async function getOnboarding(): Promise<OnboardingState | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  try {
    const response = await fetch(`${API}/api/onboarding`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (response.status === 401) return null;
    if (!response.ok) {
      return emptyOnboarding();
    }
    return (await response.json()) as OnboardingState;
  } catch {
    return emptyOnboarding();
  }
}
