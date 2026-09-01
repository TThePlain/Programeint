import { describe, expect, it } from "vitest";
import { JAVA_PATH_RE, sanitizeLabFiles } from "./lab";

describe("lab files", () => {
  it("aceita Main.java e rejeita path traversal", () => {
    expect(JAVA_PATH_RE.test("Main.java")).toBe(true);
    expect(JAVA_PATH_RE.test("util/Helper.java")).toBe(true);
    expect(() => sanitizeLabFiles([{ path: "../Etc.java", content: "class X {}" }])).toThrow();
    expect(() => sanitizeLabFiles([{ path: "Main.java", content: "class Main {}" }])).not.toThrow();
  });
});
