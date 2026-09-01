import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { CalendarService } from "./calendar.service";

@Controller("calendar")
@UseGuards(SessionGuard)
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendar: CalendarService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.calendar.list(user.id, from, to);
  }

  @Get("today")
  today(@CurrentUser() user: { id: string }, @Query("day") day?: string) {
    return this.calendar.today(user.id, day);
  }

  @Post("events")
  create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.calendar.create(user.id, body);
  }

  @Post("events/:id/complete")
  complete(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.calendar.complete(user.id, id, body);
  }

  @Delete("events/:id")
  cancel(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.calendar.cancel(user.id, id);
  }

  @Post("plan-week")
  planWeek(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.calendar.planWeek(user.id, body);
  }

  @Post("schedule")
  createSchedule(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.calendar.createSchedule(user.id, body);
  }
}
