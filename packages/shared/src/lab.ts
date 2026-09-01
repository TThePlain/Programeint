export const JAVA_PATH_RE = /^[A-Za-z][A-Za-z0-9]*(\/[A-Za-z][A-Za-z0-9]*)*\.java$/;
export const GUIDED_PATH_RE = /^[A-Za-z][A-Za-z0-9_-]*\.md$/;
export const MAX_LAB_FILES = 8;
export const MAX_LAB_FILE_BYTES = 32_768;

export function assertJavaPath(path: string) {
  if (!JAVA_PATH_RE.test(path) || path.includes("..") || path.length > 80) {
    throw new Error("Nome de ficheiro Java inválido.");
  }
}

export function assertGuidedPath(path: string) {
  if (!GUIDED_PATH_RE.test(path) || path.includes("..") || path.length > 80) {
    throw new Error("Nome de ficheiro de prática inválido (usa .md).");
  }
}

export function sanitizeLabFiles(
  files: Array<{ path: string; content: string }>,
  mode: "java" | "guided" = "java",
) {
  if (files.length === 0 || files.length > MAX_LAB_FILES) {
    throw new Error(`O lab aceita entre 1 e ${MAX_LAB_FILES} ficheiros.`);
  }
  const seen = new Set<string>();
  return files.map((file) => {
    if (mode === "guided") assertGuidedPath(file.path);
    else assertJavaPath(file.path);
    if (seen.has(file.path)) throw new Error("Ficheiros duplicados.");
    seen.add(file.path);
    if (file.content.length > MAX_LAB_FILE_BYTES) {
      throw new Error(`Ficheiro ${file.path} excede ${MAX_LAB_FILE_BYTES} bytes.`);
    }
    if (file.content.includes("\0")) throw new Error("Ficheiro binário recusado.");
    return { path: file.path, content: file.content.replace(/\r\n/g, "\n") };
  });
}

/** Evidência escrita (prática / problemas / projecto) — sem Docker. */
export function evaluateGuidedEvidence(
  content: string,
  kind: "practice" | "project" = "practice",
): { passed: boolean; stdout: string } {
  const text = content.trim();
  const min = kind === "project" ? 200 : 120;
  if (text.length < min) {
    return {
      passed: false,
      stdout: `Escreve pelo menos ~${min} caracteres de evidência concreta (sem placeholders).`,
    };
  }
  if (/TODO|\[preencher\]|escreve aqui|sua resposta|your answer/i.test(text)) {
    return {
      passed: false,
      stdout: "Remove placeholders (TODO / «escreve aqui») e preenche com o teu trabalho.",
    };
  }
  // Linhas "- Rótulo:" sem resposta não contam
  const filledBullets = (text.match(/^\s*([-*]|\d+\.)\s+.+$/gm) ?? []).filter(
    (line) => !/^\s*([-*]|\d+\.)\s+[^:\n]+:\s*$/.test(line),
  );
  if (filledBullets.length < 2) {
    return {
      passed: false,
      stdout:
        "Preenche pelo menos 2 pontos com conteúdo real (não deixes só «- Enunciado:» vazio).",
    };
  }
  return {
    passed: true,
    stdout:
      kind === "project"
        ? "PASS — evidência de projecto aceite (revisão humana futura pode aprofundar)."
        : "PASS — evidência de prática aceite.",
  };
}
