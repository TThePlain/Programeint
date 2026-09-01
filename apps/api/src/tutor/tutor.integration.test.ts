import "reflect-metadata";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
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
process.env.AI_API_KEY = "";
process.env.AI_BASE_URL = "";
process.env.AI_MODEL = "";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

describe("tutor integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let provider: Server;
  let providerUrl: string;
  let lastPrompt: string[] = [];
  let cookie: string[];
  let userId: string;
  const email = `tutor.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";

  const ownMessages = () =>
    prisma.tutorMessage.findMany({
      where: { conversation: { userId } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

  beforeAll(async () => {
    provider = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}") as {
          messages?: Array<{ role: string; content: string }>;
        };
        lastPrompt = (body.messages ?? []).map((m) => `${m.role}: ${m.content}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            model: "modelo-stub",
            choices: [{ message: { content: "Começa por escrever o caso mais simples." } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        );
      });
    });
    await new Promise<void>((r) => provider.listen(0, "127.0.0.1", r));
    providerUrl = `http://127.0.0.1:${(provider.address() as AddressInfo).port}/v1`;

    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email } });

    const server = app.getHttpServer();
    await request(server).post("/api/auth/register").send({ name: "Aluno Tutor", email, password });
    const token = await waitForMailToken(email, "verificar-email");
    await request(server).post("/api/auth/verify-email").send({ token });
    const login = await request(server).post("/api/auth/login").send({ email, password });
    cookie = login.headers["set-cookie"];
    userId = (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
    await new Promise<void>((r) => provider.close(() => r()));
    process.env.AI_API_KEY = "";
    process.env.AI_BASE_URL = "";
  });

  it("sem AI_API_KEY fica BLOCKED e não grava resposta inventada", async () => {
    const server = app.getHttpServer();

    const status = await request(server).get("/api/tutor/status");
    expect(status.status).toBe(200);
    expect(status.body.configured).toBe(false);
    expect(status.body.model).toBeNull();
    expect(status.body.errorCode).toBe("BLOCKED/CONFIGURATION_REQUIRED");
    expect(status.body.message).toMatch(/AI_API_KEY/);

    const thread = await request(server).get("/api/tutor/threads/algorithms").set("Cookie", cookie);
    expect(thread.status).toBe(200);
    expect(thread.body.configured).toBe(false);
    expect(thread.body.node.slug).toBe("algorithms");
    expect(thread.body.messages).toEqual([]);

    const ask = await request(server)
      .post("/api/tutor/threads/algorithms/messages")
      .set("Cookie", cookie)
      .send({ content: "como começo este exercício?" });
    expect(ask.status).toBe(409);
    expect(ask.body.code).toBe("BLOCKED/CONFIGURATION_REQUIRED");

    expect(await ownMessages()).toHaveLength(0);
  });

  it("exige sessão", async () => {
    const thread = await request(app.getHttpServer()).get("/api/tutor/threads/algorithms");
    expect(thread.status).toBe(401);
  });

  it("com provider configurado grava a conversa e ancora o prompt no nó", async () => {
    process.env.AI_API_KEY = "chave-stub";
    process.env.AI_BASE_URL = providerUrl;
    process.env.AI_MODEL = "modelo-stub";
    const server = app.getHttpServer();

    const status = await request(server).get("/api/tutor/status");
    expect(status.body.configured).toBe(true);
    expect(status.body.model).toBe("modelo-stub");
    expect(status.body.errorCode).toBeNull();

    const ask = await request(server)
      .post("/api/tutor/threads/algorithms/messages")
      .set("Cookie", cookie)
      .send({ content: "como começo este exercício?" });

    expect(ask.status).toBe(201);
    expect(ask.body.messages).toHaveLength(2);
    expect(ask.body.messages[0].role).toBe("user");
    expect(ask.body.messages[1].role).toBe("assistant");
    expect(ask.body.messages[1].content).toBe("Começa por escrever o caso mais simples.");

    const system = lastPrompt[0];
    expect(system).toMatch(/^system: /);
    expect(system).toContain("Algoritmos");
    expect(system).toContain("Nunca escrevas a solução completa");
    expect(lastPrompt.at(-1)).toBe("user: como começo este exercício?");

    const stored = await ownMessages();
    expect(stored).toHaveLength(2);
    const assistant = stored.find((row) => row.role === "assistant");
    expect(assistant?.model).toBe("modelo-stub");
    expect(assistant?.promptTokens).toBe(10);

    // Segunda pergunta reaproveita a conversa e envia o histórico.
    const again = await request(server)
      .post("/api/tutor/threads/algorithms/messages")
      .set("Cookie", cookie)
      .send({ content: "e depois?" });
    expect(again.status).toBe(201);
    expect(again.body.messages).toHaveLength(4);
    expect(lastPrompt).toContain("user: como começo este exercício?");
    expect(await prisma.tutorConversation.count({ where: { userId } })).toBe(1);
  });

  it("recusa nó inexistente e conteúdo vazio", async () => {
    const server = app.getHttpServer();
    const missing = await request(server)
      .get("/api/tutor/threads/nao-existe")
      .set("Cookie", cookie);
    expect(missing.status).toBe(404);

    const empty = await request(server)
      .post("/api/tutor/threads/algorithms/messages")
      .set("Cookie", cookie)
      .send({ content: " " });
    expect(empty.status).toBe(400);
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
