import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { resolve } from "node:path";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { seedCurriculum, seedLabExercises, seedProjects } from "@programeint/database";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

config({ path: resolve(process.cwd(), "../../.env") });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/programeint_test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

const SOLUTION_TWICE = `public class Solution {
  public static int twice(int n) {
    return n * 2;
  }
}
`;

const SOLUTION_HELLO = `public class Main {
  public static void main(String[] args) {
    System.out.println("Olá, JVM");
  }
}
`;

const SOLUTION_CATALOG = `public class Catalog {
  private Task[] tasks = new Task[0];

  public void add(String title) {
    Task[] next = new Task[tasks.length + 1];
    System.arraycopy(tasks, 0, next, 0, tasks.length);
    next[tasks.length] = new Task(title, false);
    tasks = next;
  }

  public void complete(int index) {
    Task current = tasks[index];
    Task[] next = new Task[tasks.length];
    System.arraycopy(tasks, 0, next, 0, tasks.length);
    next[index] = new Task(current.title(), true);
    tasks = next;
  }

  public int size() {
    return tasks.length;
  }

  public int pendingCount() {
    int n = 0;
    for (Task task : tasks) {
      if (!task.done()) n++;
    }
    return n;
  }

  public String titles() {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < tasks.length; i++) {
      if (i > 0) sb.append('\\n');
      sb.append(tasks[i].title());
    }
    return sb.toString();
  }
}
`;

function labFiles(slug: string) {
  if (slug === "algo-twice") return [{ path: "Solution.java", content: SOLUTION_TWICE }];
  if (slug === "java-hello") return [{ path: "Main.java", content: SOLUTION_HELLO }];
  if (slug === "oop-counter") {
    return [
      {
        path: "Counter.java",
        content: `public class Counter {
  private int value;
  public void increment() { value++; }
  public int getValue() { return value; }
}
`,
      },
    ];
  }
  if (slug === "collections-unique") {
    return [
      {
        path: "Solution.java",
        content: `import java.util.HashSet;
import java.util.Set;

public class Solution {
  public static int uniqueCount(String[] items) {
    Set<String> set = new HashSet<>();
    for (String item : items) set.add(item);
    return set.size();
  }
}
`,
      },
    ];
  }
  if (slug === "exceptions-parse") {
    return [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int parseOrZero(String text) {
    if (text == null || text.isBlank()) return 0;
    try {
      return Integer.parseInt(text.trim());
    } catch (NumberFormatException e) {
      return 0;
    }
  }
}
`,
      },
    ];
  }
  if (slug === "testing-assert") {
    return [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int max(int a, int b) {
    return a >= b ? a : b;
  }
}
`,
      },
    ];
  }
  if (slug === "rest-status") {
    return [
      {
        path: "Solution.java",
        content: `public class Solution {
  public static int statusFor(String situation) {
    if ("ok".equals(situation)) return 200;
    if ("created".equals(situation)) return 201;
    if ("bad_request".equals(situation)) return 400;
    if ("not_found".equals(situation)) return 404;
    if ("error".equals(situation)) return 500;
    return 400;
  }
}
`,
      },
    ];
  }
  return null;
}

describe("project integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `project.${Date.now()}@programeint.test`;
  const password = "senha-segura-1";

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    await seedCurriculum(prisma);
    await seedLabExercises(prisma);
    await seedProjects(prisma);
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("só gera evidência de portfólio depois de testes isolados", { timeout: 120_000 }, async () => {
    const server = app.getHttpServer();
    await request(server).post("/api/auth/register").send({
      name: "Aluno Projeto",
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

    expect((await request(server).get("/api/projects").set("Cookie", cookie)).status).toBe(200);
    const before = await request(server).get("/api/projects").set("Cookie", cookie);
    expect(before.body.items[0].locked).toBe(true);

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

    for (let i = 0; i < 48; i += 1) {
      const next = await request(server).get("/api/learning/next").set("Cookie", cookie);
      if (next.body.kind === "project_build") break;
      if (next.body.kind === "module_unpublished") {
        // Tip da trilha ainda sem módulo (testing/REST/Spring): o projeto intermédio deve surgir.
        break;
      }
      if (next.body.kind === "lab_exercise") {
        const slug = next.body.exerciseSlug as string;
        const files = labFiles(slug);
        if (!files) break;
        await request(server)
          .put(`/api/lab/exercises/${slug}/files`)
          .set("Cookie", cookie)
          .send({ files });
        const ran = await request(server)
          .post(`/api/lab/exercises/${slug}/runs`)
          .set("Cookie", cookie);
        if (ran.body.lastRun?.status === "blocked") {
          expect(ran.body.lastRun.errorCode).toBe("BLOCKED/CONFIGURATION_REQUIRED");
          return;
        }
        expect(ran.body.lastRun.passed).toBe(true);
        continue;
      }
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
    expect(next.body.kind).toBe("project_build");
    expect(next.body.href).toMatch(/^\/projeto\//);

    const list = await request(server).get("/api/projects").set("Cookie", cookie);
    expect(list.status).toBe(200);
    const catalog = list.body.items.find((item: { slug: string }) => item.slug === "java-catalog");
    expect(catalog.locked).toBe(false);

    const empty = await request(server).get("/api/portfolio").set("Cookie", cookie);
    expect(empty.body.items).toEqual([]);

    const slug = next.body.projectSlug as string;
    const opened = await request(server).get(`/api/projects/${slug}`).set("Cookie", cookie);
    expect(opened.status).toBe(200);
    expect(JSON.stringify(opened.body)).not.toContain("Check.java");
    expect(opened.body.files.some((file: { path: string }) => file.path === "Catalog.java")).toBe(
      true,
    );

    const files = opened.body.files.map((file: { path: string; content: string }) =>
      file.path === "Catalog.java" ? { path: file.path, content: SOLUTION_CATALOG } : file,
    );
    const saved = await request(server)
      .put(`/api/projects/${slug}/files`)
      .set("Cookie", cookie)
      .send({ files });
    expect(saved.status).toBe(200);

    const ran = await request(server).post(`/api/projects/${slug}/runs`).set("Cookie", cookie);
    expect(ran.status).toBe(201);
    if (ran.body.lastRun.status === "blocked") {
      expect(ran.body.lastRun.errorCode).toBe("BLOCKED/CONFIGURATION_REQUIRED");
      return;
    }
    expect(ran.body.lastRun.passed).toBe(true);
    expect(ran.body.lastRun.stdout).toMatch(/PASS/);
    expect(ran.body.passed).toBe(true);

    const portfolio = await request(server).get("/api/portfolio").set("Cookie", cookie);
    expect(portfolio.body.items).toHaveLength(1);
    expect(portfolio.body.items[0].projectSlug).toBe(slug);
    expect(portfolio.body.items[0].summary).toMatch(/não um certificado/i);
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
