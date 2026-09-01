import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CurriculumModule } from "../curriculum/curriculum.module";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

@Module({
  imports: [AuthModule, CurriculumModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
