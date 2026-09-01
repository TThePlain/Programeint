CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goal_targets" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "goal_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceLevel" TEXT NOT NULL,
    "weeklyHours" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "prefersVideo" BOOLEAN NOT NULL DEFAULT true,
    "prefersReading" BOOLEAN NOT NULL DEFAULT true,
    "prefersPractice" BOOLEAN NOT NULL DEFAULT true,
    "knownTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_preferences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "goals_userId_status_idx" ON "goals"("userId", "status");
CREATE UNIQUE INDEX "goal_targets_goalId_slug_key" ON "goal_targets"("goalId", "slug");
CREATE UNIQUE INDEX "study_preferences_userId_key" ON "study_preferences"("userId");

ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_targets" ADD CONSTRAINT "goal_targets_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_preferences" ADD CONSTRAINT "study_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goals" ADD CONSTRAINT "goals_status_check" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "study_preferences" ADD CONSTRAINT "study_preferences_experience_check" CHECK ("experienceLevel" IN ('none', 'beginner', 'intermediate', 'advanced'));
ALTER TABLE "study_preferences" ADD CONSTRAINT "study_preferences_weekly_check" CHECK ("weeklyHours" >= 1 AND "weeklyHours" <= 40);
ALTER TABLE "study_preferences" ADD CONSTRAINT "study_preferences_session_check" CHECK ("sessionMinutes" IN (15, 25, 45, 60, 90));
