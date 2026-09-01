import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { mkdir, mkdtemp, rm, writeFile, chmod, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertJavaPath } from "@programeint/shared";

export const LAB_JAVA_IMAGE = process.env.LAB_JAVA_IMAGE ?? "eclipse-temurin:21-jdk-alpine";
export const BLOCKED_DOCKER = "BLOCKED/CONFIGURATION_REQUIRED";

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function dockerBin() {
  return process.env.DOCKER_BIN ?? join(homedir(), ".local/bin/docker");
}

function dockerEnv(): NodeJS.ProcessEnv {
  const sock = join(homedir(), ".lima/docker/sock/docker.sock");
  return {
    ...process.env,
    PATH: `${join(homedir(), ".local/bin")}:${process.env.PATH ?? ""}`,
    DOCKER_HOST: process.env.DOCKER_HOST ?? `unix://${sock}`,
  };
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: dockerEnv() });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 20_000) stdout = stdout.slice(0, 20_000);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 20_000) stderr = stderr.slice(0, 20_000);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: 127, stdout, stderr: `${stderr}\n${error.message}`, timedOut });
    });
  });
}

export async function probeLabSandbox(): Promise<{ ok: boolean; message: string }> {
  const info = await run(dockerBin(), ["info"], 8_000);
  if (info.code !== 0) {
    return {
      ok: false,
      message: `${BLOCKED_DOCKER}: Docker/Lima não responde. O código do aluno não corre no processo da API.`,
    };
  }
  const images = await run(dockerBin(), ["images", "-q", LAB_JAVA_IMAGE], 8_000);
  if (!images.stdout.trim()) {
    return {
      ok: false,
      message: `${BLOCKED_DOCKER}: imagem ${LAB_JAVA_IMAGE} em falta. Corre docker pull ${LAB_JAVA_IMAGE}.`,
    };
  }
  return { ok: true, message: "Sandbox Docker disponível (Temurin 21)." };
}

async function chmodWorldReadable(dir: string): Promise<void> {
  await chmod(dir, 0o755);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await chmodWorldReadable(path);
    else await chmod(path, 0o644);
  }
}

export type SandboxRun = {
  status: "succeeded" | "failed" | "timeout" | "blocked";
  passed: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  errorCode: string | null;
};

export async function runJavaSandbox(input: {
  files: Array<{ path: string; content: string }>;
  entryClass: string;
  timeoutMs: number;
}): Promise<SandboxRun> {
  const probe = await probeLabSandbox();
  if (!probe.ok) {
    return {
      status: "blocked",
      passed: false,
      exitCode: null,
      stdout: "",
      stderr: probe.message,
      errorCode: BLOCKED_DOCKER,
    };
  }

  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(input.entryClass)) {
    return {
      status: "failed",
      passed: false,
      exitCode: 2,
      stdout: "",
      stderr: "Classe de entrada inválida.",
      errorCode: null,
    };
  }

  const cache = join(homedir(), ".cache", "programeint-lab");
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(join(cache, "run-"));
  try {
    for (const file of input.files) {
      assertJavaPath(file.path);
      const dest = join(root, file.path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, file.content, { encoding: "utf8", mode: 0o644 });
    }
    await chmodWorldReadable(root);

    const args = [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,exec,nosuid,nodev,size=64m",
      "--user",
      "65534:65534",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--memory",
      "256m",
      "--memory-swap",
      "256m",
      "--cpus",
      "0.5",
      "--pids-limit",
      "64",
      "--workdir",
      "/tmp",
      "-v",
      `${root}:/src:ro`,
      LAB_JAVA_IMAGE,
      "sh",
      "-c",
      `cp -R /src/. /tmp && javac *.java && java ${input.entryClass}`,
    ];

    const result = await run(dockerBin(), args, input.timeoutMs);
    if (result.timedOut) {
      return {
        status: "timeout",
        passed: false,
        exitCode: null,
        stdout: result.stdout,
        stderr: result.stderr || "Tempo esgotado no contentor.",
        errorCode: null,
      };
    }
    const passed = result.code === 0;
    return {
      status: passed ? "succeeded" : "failed",
      passed,
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      errorCode: null,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
