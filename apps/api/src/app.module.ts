import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "node:path";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { DiagnosisModule } from "./diagnosis/diagnosis.module";
import { LearningEngineModule } from "./learning/learning.module";
import { LabModule } from "./lab/lab.module";
import { ProjectModule } from "./project/project.module";
import { GithubModule } from "./github/github.module";
import { TutorModule } from "./tutor/tutor.module";
import { LibraryModule } from "./library/library.module";
import { CalendarModule } from "./calendar/calendar.module";
import { AccountModule } from "./account/account.module";
import { WorkSimModule } from "./work-sim/work-sim.module";
import { ForumModule } from "./forum/forum.module";
import { NewsModule } from "./news/news.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), "../../.env"),
        resolve(process.cwd(), ".env"),
      ],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    HealthModule,
    AuthModule,
    OnboardingModule,
    DiagnosisModule,
    LearningEngineModule,
    LabModule,
    ProjectModule,
    GithubModule,
    TutorModule,
    LibraryModule,
    CalendarModule,
    AccountModule,
    WorkSimModule,
    ForumModule,
    NewsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
