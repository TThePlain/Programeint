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

describe("account integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `account.${Date.now()}@programeint.test`;
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
      name: "Aluno Conta",
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
      weeklyHours: 4,
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

  it("exporta dados sem segredos e apaga a conta com confirmação", async () => {
    const server = app.getHttpServer();
    expect((await request(server).get("/api/account/export")).status).toBe(401);

    const exported = await request(server).get("/api/account/export").set("Cookie", cookie);
    expect(exported.status).toBe(200);
    expect(exported.body.user.email).toBe(email);
    expect(exported.body.goals[0].statement).toMatch(/Java/);
    expect(exported.body.preferences.weeklyHours).toBe(4);
    expect(JSON.stringify(exported.body)).not.toMatch(/passwordHash|tokenCipher|tokenHash/);

    const bad = await request(server)
      .delete("/api/account")
      .set("Cookie", cookie)
      .send({ password: "errada-errada-1", confirm: "APAGAR" });
    expect(bad.status).toBe(401);

    const removed = await request(server)
      .delete("/api/account")
      .set("Cookie", cookie)
      .send({ password, confirm: "APAGAR" });
    expect(removed.status).toBe(200);
    expect(removed.body.ok).toBe(true);

    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

    const session = await request(server).get("/api/auth/session").set("Cookie", cookie);
    expect(session.body.user).toBeNull();
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
