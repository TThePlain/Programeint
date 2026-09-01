import { Module } from "@nestjs/common";
import { CurriculumGeneratorService } from "./curriculum-generator.service";

@Module({
  providers: [CurriculumGeneratorService],
  exports: [CurriculumGeneratorService],
})
export class CurriculumModule {}
