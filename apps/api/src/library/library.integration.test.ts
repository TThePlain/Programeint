import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { resolve } from "node:path";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { RESOURCE_LICENSES } from "@programeint/shared";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

config({ path: resolve(process.cwd(), "../../.env") });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/programeint_test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

type Item = {
  slug: string;
  url: string;
  kind: string;
  license: { id: string; label: string; url: string | null };
  nodes: Array<{ slug: string }>;
};

describe("library integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  const email = `library.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email } });

    const server = app.getHttpServer();
    await request(server).post("/api/auth/register").send({ name: "Aluno Lib", email, password });
    const token = await waitForMailToken(email, "verificar-email");
    await request(server).post("/api/auth/verify-email").send({ token });
    const login = await request(server).post("/api/auth/login").send({ email, password });
    cookie = login.headers["set-cookie"];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("exige sessão", async () => {
    const anon = await request(app.getHttpServer()).get("/api/library");
    expect(anon.status).toBe(401);
  });

  it("lista apenas recursos oficiais, https e com licença conhecida", async () => {
    const res = await request(app.getHttpServer()).get("/api/library").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.policy).toMatch(/nunca aloja/i);

    const items = res.body.items as Item[];
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.url.startsWith("https://")).toBe(true);
      expect(Object.keys(RESOURCE_LICENSES)).toContain(item.license.id);
      expect(item.license.url).not.toBeNull();
      expect(item.nodes.length).toBeGreaterThan(0);
    }
  });

  it("filtra por nó e por tipo", async () => {
    const server = app.getHttpServer();

    const byNode = await request(server).get("/api/library?node=git").set("Cookie", cookie);
    expect(byNode.status).toBe(200);
    const slugs = (byNode.body.items as Item[]).map((item) => item.slug);
    expect(slugs).toContain("pro-git");
    for (const item of byNode.body.items as Item[]) {
      expect(item.nodes.map((node) => node.slug)).toContain("git");
    }

    const byKind = await request(server).get("/api/library?kind=book").set("Cookie", cookie);
    for (const item of byKind.body.items as Item[]) {
      expect(item.kind).toBe("book");
    }
  });

  it("devolve os recursos de um nó e 404 para nó inexistente", async () => {
    const server = app.getHttpServer();

    const ok = await request(server).get("/api/library/nodes/sql").set("Cookie", cookie);
    expect(ok.status).toBe(200);
    expect(ok.body.node.slug).toBe("sql");
    expect((ok.body.items as Item[]).map((item) => item.slug)).toContain("postgresql-docs");

    const missing = await request(server).get("/api/library/nodes/nao-existe").set("Cookie", cookie);
    expect(missing.status).toBe(404);
  });

  it("não serve recurso que viole a política, mesmo gravado na base", async () => {
    const node = await prisma.knowledgeNode.findFirstOrThrow({ where: { slug: "java" } });
    const intruso = await prisma.learningResource.create({
      data: {
        slug: `intruso-${Date.now()}`,
        title: "Cópia não oficial",
        url: "http://exemplo-pirata.invalid/livro.pdf",
        publisher: "desconhecido",
        kind: "book",
        license: "todos-os-direitos-reservados",
        language: "pt-BR",
        summary: "Cópia sem licença.",
        official: false,
        published: true,
        nodes: { create: [{ nodeId: node.id }] },
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .get("/api/library?node=java")
        .set("Cookie", cookie);
      const slugs = (res.body.items as Item[]).map((item) => item.slug);
      expect(slugs).not.toContain(intruso.slug);
    } finally {
      await prisma.learningResource.delete({ where: { id: intruso.id } });
    }
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
