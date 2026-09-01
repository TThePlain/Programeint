import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AiProviderError, createAiProvider } from "./provider";

type StubReply = { status: number; body: unknown };

let server: Server;
let baseUrl: string;
let reply: StubReply;
let lastRequest: { path: string; auth?: string; body: Record<string, unknown> };

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      lastRequest = {
        path: req.url ?? "",
        auth: req.headers.authorization,
        body: raw ? JSON.parse(raw) : {},
      };
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("createAiProvider", () => {
  it("devolve null sem chave — não há fallback simulado", () => {
    expect(createAiProvider({ apiKey: "" })).toBeNull();
    expect(createAiProvider({ apiKey: "   " })).toBeNull();
    expect(createAiProvider({ apiKey: undefined })).toBeNull();
  });

  it("fala com endpoint compatível com OpenAI e devolve conteúdo e tokens", async () => {
    reply = {
      status: 200,
      body: {
        model: "modelo-stub",
        choices: [{ message: { content: "  Pensa no invariante do ciclo.  " } }],
        usage: { prompt_tokens: 42, completion_tokens: 7 },
      },
    };
    const provider = createAiProvider({ apiKey: "chave-stub", baseUrl, model: "modelo-stub" });
    const result = await provider!.complete([
      { role: "system", content: "regras" },
      { role: "user", content: "porque é que isto falha?" },
    ]);

    expect(result.content).toBe("Pensa no invariante do ciclo.");
    expect(result.model).toBe("modelo-stub");
    expect(result.promptTokens).toBe(42);
    expect(result.completionTokens).toBe(7);

    expect(lastRequest.path).toBe("/v1/chat/completions");
    expect(lastRequest.auth).toBe("Bearer chave-stub");
    expect(lastRequest.body.model).toBe("modelo-stub");
    expect(lastRequest.body.messages).toEqual([
      { role: "system", content: "regras" },
      { role: "user", content: "porque é que isto falha?" },
    ]);
  });

  it("propaga erro do provider em vez de inventar resposta", async () => {
    reply = { status: 401, body: { error: { message: "chave inválida" } } };
    const provider = createAiProvider({ apiKey: "chave-má", baseUrl });
    await expect(provider!.complete([{ role: "user", content: "olá" }])).rejects.toThrow(
      AiProviderError,
    );
  });

  it("rejeita resposta vazia", async () => {
    reply = { status: 200, body: { choices: [{ message: { content: "   " } }] } };
    const provider = createAiProvider({ apiKey: "chave-stub", baseUrl });
    await expect(provider!.complete([{ role: "user", content: "olá" }])).rejects.toThrow(
      /resposta vazia/,
    );
  });
});
