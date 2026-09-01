import { describe, expect, it } from "vitest";
import { GITHUB_BLOCKED, githubOauthReady } from "./github";

describe("github oauth", () => {
  it("só está pronto com client id e secret", () => {
    expect(githubOauthReady(undefined, undefined)).toBe(false);
    expect(githubOauthReady("id", "")).toBe(false);
    expect(githubOauthReady("id", "secret")).toBe(true);
    expect(GITHUB_BLOCKED).toBe("BLOCKED/CONFIGURATION_REQUIRED");
  });
});
