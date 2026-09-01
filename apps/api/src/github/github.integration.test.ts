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
process.env.GITHUB_CLIENT_ID = "";
process.env.GITHUB_CLIENT_SECRET = "";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

describe("github integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `github.${Date.now()}@programeint.test`;
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

  it("sem credenciais OAuth fica BLOCKED e não inventa conta ligada", async () => {
    const server = app.getHttpServer();
    await request(server).post("/api/auth/register").send({
      name: "Aluno GitHub",
      email,
      password,
    });
    const token = await waitForMailToken(email, "verificar-email");
    await request(server).post("/api/auth/verify-email").send({ token });
    const login = await request(server).post("/api/auth/login").send({ email, password });
    const cookie = login.headers["set-cookie"];

    const status = await request(server).get("/api/github/status").set("Cookie", cookie);
    expect(status.status).toBe(200);
    expect(status.body.configured).toBe(false);
    expect(status.body.connected).toBe(false);
    expect(status.body.canPublish).toBe(false);
    expect(status.body.login).toBeNull();
    expect(status.body.errorCode).toBe("BLOCKED/CONFIGURATION_REQUIRED");
    expect(status.body.message).toMatch(/GITHUB_CLIENT_ID/);

    const connect = await request(server).get("/api/github/connect").set("Cookie", cookie);
    expect(connect.status).toBe(409);
    expect(connect.body.code).toBe("BLOCKED/CONFIGURATION_REQUIRED");

    const callback = await request(server).get("/api/github/callback").query({ code: "x", state: "y" });
    expect(callback.status).toBe(409);

    const publish = await request(server).post("/api/github/publish-evidence").set("Cookie", cookie);
    expect(publish.status).toBe(409);
    expect(publish.body.code).toBe("BLOCKED/CONFIGURATION_REQUIRED");

    const accounts = await prisma.githubAccount.count();
    expect(accounts).toBe(0);
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
