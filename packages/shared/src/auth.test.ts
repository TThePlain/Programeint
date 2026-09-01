import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("registerSchema", () => {
  it("aceita um registo válido e normaliza o e-mail", () => {
    const parsed = registerSchema.parse({
      name: "Vitor",
      email: "  Vitor@Example.COM ",
      password: "senha-segura-1",
    });
    expect(parsed.email).toBe("vitor@example.com");
  });

  it("rejeita senha curta", () => {
    const result = registerSchema.safeParse({
      name: "Vitor",
      email: "vitor@example.com",
      password: "ab1",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejeita e-mail inválido", () => {
    const result = loginSchema.safeParse({ email: "nao-e-email", password: "x" });
    expect(result.success).toBe(false);
  });
});
