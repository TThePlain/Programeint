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

describe("learning integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `learn.${Date.now()}@programeint.test`;
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

  it("exige diagnóstico, estuda o nó falhado e agenda FSRS", async () => {
    const server = app.getHttpServer();
    expect((await request(server).get("/api/learning/next")).status).toBe(401);

    await request(server).post("/api/auth/register").send({
      name: "Aluno Estudo",
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

    // Estudo do texto não depende do diagnóstico (diagnóstico continua a ser a próxima acção recomendada).
    const early = await request(server)
      .post("/api/learning/sessions")
      .set("Cookie", cookie)
      .send({ nodeSlug: "algorithms" });
    expect(early.status).toBe(201);
    expect(early.body.module.body.length).toBeGreaterThan(40);

    const userEarly = await prisma.user.findUnique({ where: { email } });
    await prisma.studySession.updateMany({
      where: { userId: userEarly!.id, status: "in_progress" },
      data: { status: "abandoned" },
    });

    const before = await request(server).get("/api/learning/next").set("Cookie", cookie);
    expect(before.body.kind).toBe("study_module");

    const started = await request(server).post("/api/diagnosis/sessions").set("Cookie", cookie);
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
      view = answered.body;
    }
    expect(view.status).toBe("completed");

    const next = await request(server).get("/api/learning/next").set("Cookie", cookie);
    expect(next.status).toBe(200);
    expect(next.body.kind).toBe("study_module");
    expect(["logic", "algorithms", "data-structures", "java", "oop"]).toContain(next.body.nodeSlug);
    const slug = next.body.nodeSlug as string;
    expect(next.body.href).toBe(`/estudar/${slug}`);
    expect(next.body.question).toBeNull();

    const session = await request(server)
      .post("/api/learning/sessions")
      .set("Cookie", cookie)
      .send({ nodeSlug: slug });
    expect(session.status).toBe(201);
    expect(session.body.module.body.length).toBeGreaterThan(40);
    expect(session.body.question).toBeNull();
    expect(session.body.module.checkQuestionId).toBeUndefined();

    const unread = await request(server)
      .post(`/api/learning/sessions/${session.body.sessionId}/check`)
      .set("Cookie", cookie)
      .send({ questionId: "00000000-0000-4000-8000-000000000000", choiceId: "a" });
    expect(unread.status).toBe(400);

    const read = await request(server)
      .post(`/api/learning/sessions/${session.body.sessionId}/read`)
      .set("Cookie", cookie);
    expect(read.status).toBe(201);
    expect(read.body.question.prompt).toBeTruthy();
    expect(read.body.question.correctChoiceId).toBeUndefined();

    const checked = await request(server)
      .post(`/api/learning/sessions/${session.body.sessionId}/check`)
      .set("Cookie", cookie)
      .send({ questionId: read.body.question.id, choiceId: read.body.question.choices[0].id });
    expect(checked.status).toBe(201);
    expect(checked.body.status).toBe("completed");
    expect(checked.body.last.correct).toBe(true);

    const user = await prisma.user.findUnique({ where: { email } });
    const node = await prisma.knowledgeNode.findUnique({ where: { slug } });
    const mastery = await prisma.nodeMastery.findUnique({
      where: { userId_nodeId: { userId: user!.id, nodeId: node!.id } },
    });
    expect(mastery?.status).toBe("studied");
    expect(mastery?.source).toBe("study");

    const cards = await prisma.fsrsCard.findMany({ where: { userId: user!.id } });
    expect(cards.length).toBe(1);
    expect(cards[0]!.due.getTime()).toBeGreaterThan(Date.now() - 60_000);

    const after = await request(server).get("/api/learning/next").set("Cookie", cookie);
    expect(["study_module", "lab_exercise", "project_build"]).toContain(after.body.kind);
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
