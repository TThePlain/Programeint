import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkSimController } from "./work-sim.controller";
import { WorkSimService } from "./work-sim.service";

@Module({
  imports: [AuthModule],
  controllers: [WorkSimController],
  providers: [WorkSimService],
})
export class WorkSimModule {}
