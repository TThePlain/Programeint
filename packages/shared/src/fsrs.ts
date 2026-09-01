import { Rating, createEmptyCard, fsrs, type Card } from "ts-fsrs";

const scheduler = fsrs();

export type StoredFsrsCard = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
};

function toCard(stored: StoredFsrsCard): Card {
  return {
    due: stored.due,
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsedDays,
    scheduled_days: stored.scheduledDays,
    learning_steps: stored.learningSteps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: stored.lastReview ?? undefined,
  };
}

function fromCard(card: Card): StoredFsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

export function reviewCard(
  stored: StoredFsrsCard | null,
  correct: boolean,
  now = new Date(),
): StoredFsrsCard {
  const card = stored ? toCard(stored) : createEmptyCard(now);
  const grade = correct ? Rating.Good : Rating.Again;
  return fromCard(scheduler.next(card, now, grade).card);
}
