import { afterAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, generateToken, hashToken } from "./crypto";

describe("crypto", () => {
  it("gera tokens com entropia suficiente e hashes estáveis", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(a)).toHaveLength(64);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
  });

  it("cifra e decifra um token GitHub", () => {
    const secret = "test-session-secret";
    const token = "gho_example_token";
    const cipher = encryptSecret(token, secret);
    expect(cipher).not.toContain(token);
    expect(decryptSecret(cipher, secret)).toBe(token);
  });
});

afterAll(() => undefined);
