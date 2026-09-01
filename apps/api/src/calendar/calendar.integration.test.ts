import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { resolve } from "node:path";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

config({ path: resolve(process.cwd(), "../../.env") });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/programeint_test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

describe("calendar integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `calendar.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";
  let cookie: string | string[];

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email } });

    const server = app.getHttpServer();
    await request(server).post("/api/auth/register").send({
      name: "Aluno Agenda",
      email,
      password,
    });
    const token = await waitForMailToken(email, "verificar-email");
    await request(server).post("/api/auth/verify-email").send({ token });
    const login = await request(server).post("/api/auth/login").send({ email, password });
    cookie = login.headers["set-cookie"];

    await request(server).put("/api/onboarding").set("Cookie", cookie).send({
      statement: "Quero aprender Java para backend.",
      primaryTarget: "java",
      experienceLevel: "beginner",
      knownTopics: [],
      weeklyHours: 3,
      sessionMinutes: 45,
      prefersVideo: true,
      prefersReading: true,
      prefersPractice: true,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("exige sessão, cria, lista, conclui e planeia a semana", async () => {
    const server = app.getHttpServer();
    expect((await request(server).get("/api/calendar")).status).toBe(401);

    const startsAt = "2026-09-01T18:00:00.000Z";
    const created = await request(server)
      .post("/api/calendar/events")
      .set("Cookie", cookie)
      .send({
        title: "Estudar lógica",
        kind: "study",
        startsAt,
        durationMinutes: 45,
        href: "/estudar/logic",
      });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe("Estudar lógica");
    expect(created.body.status).toBe("planned");
    const eventId = created.body.id as string;

    const from = "2026-08-31T00:00:00.000Z";
    const to = "2026-09-08T00:00:00.000Z";
    const list = await request(server)
      .get(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set("Cookie", cookie);
    expect(list.status).toBe(200);
    expect(list.body.events.some((e: { id: string }) => e.id === eventId)).toBe(true);
    expect(list.body.preferences.weeklyHours).toBe(3);
    expect(list.body.policy).toMatch(/persistidos/);

    const completed = await request(server)
      .post(`/api/calendar/events/${eventId}/complete`)
      .set("Cookie", cookie)
      .send({ focusedMinutes: 40 });
    expect(completed.status).toBe(201);
    expect(completed.body.status).toBe("completed");
    expect(completed.body.focusedMinutes).toBe(40);

    const row = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    expect(row?.status).toBe("completed");
    expect(row?.focusedMinutes).toBe(40);

    const planned = await request(server)
      .post("/api/calendar/plan-week")
      .set("Cookie", cookie)
      .send({ firstSlot: "2026-09-07T18:00:00.000Z" });
    expect(planned.status).toBe(201);
    expect(planned.body.created.length).toBe(4);
    expect(planned.body.message).toMatch(/3 h\/semana/);

    const again = await request(server)
      .post("/api/calendar/plan-week")
      .set("Cookie", cookie)
      .send({ firstSlot: "2026-09-07T18:00:00.000Z" });
    expect(again.status).toBe(201);
    expect(again.body.created.length).toBe(0);

    const cancelTarget = planned.body.created[0].id as string;
    const cancelled = await request(server)
      .delete(`/api/calendar/events/${cancelTarget}`)
      .set("Cookie", cookie);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("cancelled");
  });
});

async function waitForMailToken(to: string, pathPart: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const list = await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json());
    const messages = list.messages as Array<{ ID: string; To: Array<{ Address: string }> }>;
    const found = messages.find((m) => m.To.some((t) => t.Address.toLowerCase() === to));
    if (found) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${found.ID}`).then((r) => r.json());
      const text = String(full.Text ?? "");
      const match = text.match(new RegExp(`https?://[^\\s]+/${pathPart}\\?token=([^\\s]+)`));
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`e-mail não chegou ao Mailpit para ${to}`);
}
