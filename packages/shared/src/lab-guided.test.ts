import { describe, expect, it } from "vitest";
import { evaluateGuidedEvidence, sanitizeLabFiles } from "./lab";
import { updateGoalSchema } from "./onboarding";

describe("evaluateGuidedEvidence", () => {
  it("rejeita template só com rótulos vazios", () => {
    const body = `
# Prática
Objectivo: Quero aprender Java.

## Problema 1
- Enunciado:
- Solução:
- Resultado:

## Problema 2
- Enunciado:
- Solução:
`;
    expect(evaluateGuidedEvidence(body, "practice").passed).toBe(false);
  });

  it("aceita lista concreta suficiente", () => {
    const body = `
## Feito
- Fiz o exercício de vocabulário com 5 termos e definições próprias.
- Corrigi o erro na verificação e anotei o insight do vídeo.
- Liguei isto ao objectivo de entrevistas em inglês.
`;
    expect(evaluateGuidedEvidence(body, "practice").passed).toBe(true);
  });

  it("sanitize guided aceita .md", () => {
    const files = sanitizeLabFiles([{ path: "practice.md", content: "# ok\n" }], "guided");
    expect(files[0]?.path).toBe("practice.md");
  });
});

describe("updateGoalSchema", () => {
  it("exige statement ou nível", () => {
    expect(updateGoalSchema.safeParse({}).success).toBe(false);
    expect(updateGoalSchema.safeParse({ statement: "Quero aprofundar Java backend." }).success).toBe(
      true,
    );
  });
});
