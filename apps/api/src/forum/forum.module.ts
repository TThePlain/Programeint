import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ForumController } from "./forum.controller";
import { ForumService } from "./forum.service";

@Module({
  imports: [AuthModule],
  controllers: [ForumController],
  providers: [ForumService],
})
export class ForumModule {}
