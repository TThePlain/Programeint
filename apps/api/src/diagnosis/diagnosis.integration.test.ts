import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { resolve } from "node:path";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { seedCurriculum } from "@programeint/database";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

config({ path: resolve(process.cwd(), "../../.env") });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/programeint_test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

describe("diagnosis integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `diag.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await seedCurriculum(prisma);
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("não faz diagnóstico sem sessão e cobre o caminho Java", async () => {
    const server = app.getHttpServer();
    expect((await request(server).post("/api/diagnosis/sessions")).status).toBe(401);

    await request(server).post("/api/auth/register").send({
      name: "Aluno Diag",
      email,
      password,
    });
    const token = await waitForMailToken(email, "verificar-email");
    await request(server).post("/api/auth/verify-email").send({ token });
    const login = await request(server).post("/api/auth/login").send({ email, password });
    const cookie = login.headers["set-cookie"];

    await request(server).put("/api/onboarding").set("Cookie", cookie).send({
      statement: "Quero aprender Java para backend.",
      primaryTarget: "java",
      experienceLevel: "beginner",
      knownTopics: [],
      weeklyHours: 5,
      sessionMinutes: 45,
      prefersVideo: true,
      prefersReading: true,
      prefersPractice: true,
    });

    const started = await request(server).post("/api/diagnosis/sessions").set("Cookie", cookie);
    expect(started.status).toBe(201);
    expect(started.body.available).toBe(true);
    expect(started.body.question.prompt).toBeTruthy();
    expect(started.body.question.correctChoiceId).toBeUndefined();
    expect(started.body.question.choices.length).toBeGreaterThan(1);

    let view = started.body as {
      sessionId: string;
      status: string;
      question: { id: string; choices: Array<{ id: string }> } | null;
    };

    while (view.status === "in_progress" && view.question) {
      const answered = await request(server)
        .post(`/api/diagnosis/sessions/${view.sessionId}/answers`)
        .set("Cookie", cookie)
        .send({ questionId: view.question.id, choiceId: view.question.choices[0]?.id });
      expect(answered.status).toBe(201);
      view = answered.body;
    }

    expect(view.status).toBe("completed");
    const map = await request(server).get("/api/roadmap").set("Cookie", cookie);
    expect(map.status).toBe(200);
    expect(map.body.available).toBe(true);
    expect(map.body.nodes.some((node: { slug: string }) => node.slug === "logic")).toBe(true);
    expect(map.body.nodes.some((node: { slug: string }) => node.slug === "spring-boot")).toBe(true);

    await request(server).put("/api/onboarding").set("Cookie", cookie).send({
      statement: "Quero aprender Python para análise de dados.",
      primaryTarget: "python",
      experienceLevel: "beginner",
      knownTopics: [],
      weeklyHours: 5,
      sessionMinutes: 45,
      prefersVideo: true,
      prefersReading: true,
      prefersPractice: true,
    });
    const python = await request(server).post("/api/diagnosis/sessions").set("Cookie", cookie);
    expect(python.status).toBe(201);
    // Python passa a gerar currículo dinâmico — diagnóstico fica disponível.
    expect(python.body.available).toBe(true);
    expect(python.body.question || python.body.status).toBeTruthy();
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
