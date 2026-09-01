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

describe("onboarding integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `onboard.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("exige sessão e persiste objetivo + preferências", async () => {
    const server = app.getHttpServer();
    expect((await request(server).get("/api/onboarding")).status).toBe(401);

    await request(server).post("/api/auth/register").send({
      name: "Aluno Onboard",
      email,
      password,
    });
    const token = await waitForMailToken(email, "verificar-email");
    await request(server).post("/api/auth/verify-email").send({ token });
    const login = await request(server).post("/api/auth/login").send({ email, password });
    const cookie = login.headers["set-cookie"];

    const empty = await request(server).get("/api/onboarding").set("Cookie", cookie);
    expect(empty.status).toBe(200);
    expect(empty.body.complete).toBe(false);
    expect(empty.body.goal).toBeNull();

    const invalid = await request(server).put("/api/onboarding").set("Cookie", cookie).send({
      statement: "Java",
      primaryTarget: "cobol",
    });
    expect(invalid.status).toBe(400);

    const saved = await request(server).put("/api/onboarding").set("Cookie", cookie).send({
      statement: "Quero aprender Java para backend.",
      primaryTarget: "java",
      experienceLevel: "beginner",
      knownTopics: ["git"],
      weeklyHours: 6,
      sessionMinutes: 45,
      prefersVideo: true,
      prefersReading: false,
      prefersPractice: true,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.complete).toBe(true);
    expect(saved.body.goal.statement).toContain("Java");
    expect(saved.body.goal.primaryTarget.slug).toBe("java");
    expect(saved.body.preferences.weeklyHours).toBe(6);

    const row = await prisma.goal.findFirst({
      where: { statement: "Quero aprender Java para backend." },
      include: { targets: true },
    });
    expect(row?.targets.some((target) => target.slug === "java" && target.isPrimary)).toBe(true);
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
