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

describe("auth integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `aluno.${Date.now()}@programeint.test`;
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

  it("regista, recusa login sem verificação, confirma e-mail, entra e sai", async () => {
    const server = app.getHttpServer();

    const register = await request(server).post("/api/auth/register").send({
      name: "Aluno Teste",
      email,
      password,
    });
    expect(register.status).toBe(201);
    expect(register.body.user.email).toBe(email);
    expect(register.body.user).not.toHaveProperty("passwordHash");

    const beforeVerify = await request(server).post("/api/auth/login").send({ email, password });
    expect(beforeVerify.status).toBe(403);
    expect(beforeVerify.body.message).toMatch(/e-mail/i);

    const token = await waitForMailToken(email, "verificar-email");
    const verify = await request(server).post("/api/auth/verify-email").send({ token });
    expect(verify.status).toBe(201);

    const login = await request(server).post("/api/auth/login").send({ email, password });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"];
    expect(cookie).toBeTruthy();

    const session = await request(server).get("/api/auth/session").set("Cookie", cookie);
    expect(session.status).toBe(200);
    expect(session.body.user.email).toBe(email);

    const logout = await request(server).post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(201);

    const after = await request(server).get("/api/auth/session").set("Cookie", cookie);
    expect(after.body.user).toBeNull();
  });

  it("health ready fala com postgres e redis", async () => {
    const res = await request(app.getHttpServer()).get("/api/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.database).toBe(true);
    expect(res.body.redis).toBe(true);
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
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`e-mail de verificação não chegou ao Mailpit para ${to}`);
}
