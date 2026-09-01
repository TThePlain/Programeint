import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { resolve } from "node:path";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { seedCurriculum, seedLabExercises } from "@programeint/database";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

config({ path: resolve(process.cwd(), "../../.env") });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/programeint_test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

const SOLUTION = `public class Solution {
  public static int twice(int n) {
    return n * 2;
  }
}
`;

describe("lab integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `lab.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await seedCurriculum(prisma);
    await seedLabExercises(prisma);
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("executa Java no Docker e não envia testes ocultos ao cliente", { timeout: 90_000 }, async () => {
    const server = app.getHttpServer();
    const status = await request(server).get("/api/lab/status");
    expect(status.status).toBe(200);
    expect(status.body.ok === true || status.body.message?.includes("BLOCKED")).toBe(true);

    await request(server).post("/api/auth/register").send({
      name: "Aluno Lab",
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

    expect(
      (await request(server).get("/api/lab/exercises/algo-twice").set("Cookie", cookie)).status,
    ).toBe(400);

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

    for (let i = 0; i < 4; i += 1) {
      const next = await request(server).get("/api/learning/next").set("Cookie", cookie);
      if (next.body.kind === "lab_exercise") break;
      if (next.body.kind !== "study_module" && next.body.kind !== "study_continue") break;
      const session = await request(server)
        .post("/api/learning/sessions")
        .set("Cookie", cookie)
        .send({ nodeSlug: next.body.nodeSlug });
      const read = await request(server)
        .post(`/api/learning/sessions/${session.body.sessionId}/read`)
        .set("Cookie", cookie);
      const question = read.body.question as { id: string; choices: Array<{ id: string }> } | null;
      if (!question) break;
      await request(server)
        .post(`/api/learning/sessions/${session.body.sessionId}/check`)
        .set("Cookie", cookie)
        .send({ questionId: question.id, choiceId: question.choices[0].id });
    }

    const next = await request(server).get("/api/learning/next").set("Cookie", cookie);
    expect(next.body.kind).toBe("lab_exercise");
    expect(next.body.exerciseSlug).toBeTruthy();
    expect(next.body.href).toMatch(/^\/lab\//);

    const slug = next.body.exerciseSlug as string;
    const opened = await request(server).get(`/api/lab/exercises/${slug}`).set("Cookie", cookie);
    expect(opened.status).toBe(200);
    expect(opened.body.hiddenFiles).toBeUndefined();
    expect(JSON.stringify(opened.body)).not.toContain("Check.java");
    expect(opened.body.files.length).toBeGreaterThan(0);

    const files =
      slug === "algo-twice"
        ? [{ path: "Solution.java", content: SOLUTION }]
        : slug === "java-hello"
          ? [
              {
                path: "Main.java",
                content: `public class Main {
  public static void main(String[] args) {
    System.out.println("Olá, JVM");
  }
}
`,
              },
            ]
          : opened.body.files;

    const saved = await request(server)
      .put(`/api/lab/exercises/${slug}/files`)
      .set("Cookie", cookie)
      .send({ files });
    expect(saved.status).toBe(200);

    const ran = await request(server).post(`/api/lab/exercises/${slug}/runs`).set("Cookie", cookie);
    expect(ran.status).toBe(201);
    expect(["succeeded", "failed", "timeout", "blocked"]).toContain(ran.body.lastRun.status);
    if (ran.body.lastRun.status === "blocked") {
      expect(ran.body.lastRun.errorCode).toBe("BLOCKED/CONFIGURATION_REQUIRED");
      return;
    }
    expect(ran.body.lastRun.passed).toBe(true);
    expect(ran.body.lastRun.stdout).toMatch(/PASS|Olá, JVM/);
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
