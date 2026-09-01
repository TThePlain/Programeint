import { z } from "zod";

export const FORUM_POST_KINDS = ["discussion", "challenge", "help"] as const;
export type ForumPostKind = (typeof FORUM_POST_KINDS)[number];

export const forumPostKindLabel: Record<ForumPostKind, string> = {
  discussion: "Discussão",
  challenge: "Desafio",
  help: "Ajuda",
};

/** Limite generoso — trabalho real, não exercícios de 20 linhas. */
export const FORUM_MAX_CODE_CHARS = 500_000;
export const FORUM_MAX_BODY_CHARS = 50_000;

export const DEFAULT_CHALLENGE_STARTER = `public class Solution {
  /**
   * Implementa a solução do problema.
   * Os testes em Check.java validam o comportamento.
   */
  public static int solve(int n) {
    // TODO: resolver aqui
    return 0;
  }
}
`;

export const DEFAULT_CHALLENGE_CHECK = `public class Check {
  public static void main(String[] args) {
    int got = Solution.solve(2);
    if (got != 4) {
      System.err.println("FAIL: solve(2) esperava 4, obteve " + got);
      System.exit(1);
    }
    got = Solution.solve(5);
    if (got != 10) {
      System.err.println("FAIL: solve(5) esperava 10, obteve " + got);
      System.exit(1);
    }
    System.out.println("PASS — critérios de aceitação cumpridos.");
    System.exit(0);
  }
}
`;

export const createForumPostSchema = z
  .object({
    kind: z.enum(FORUM_POST_KINDS),
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(8).max(FORUM_MAX_BODY_CHARS),
    acceptanceCriteria: z.string().trim().max(FORUM_MAX_BODY_CHARS).optional(),
    language: z.string().trim().max(40).optional(),
    starterCode: z.string().max(FORUM_MAX_CODE_CHARS).optional(),
    checkCode: z.string().max(FORUM_MAX_CODE_CHARS).optional(),
    entryClass: z.string().trim().max(80).optional(),
    timeoutMs: z.number().int().min(3_000).max(60_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "challenge") {
      if (!value.starterCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Desafios precisam de código inicial (Solution).",
          path: ["starterCode"],
        });
      }
      if (!value.checkCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Desafios precisam de testes (Check) para validar sucesso.",
          path: ["checkCode"],
        });
      }
    }
  });

export const createForumCommentSchema = z.object({
  body: z.string().trim().min(1).max(FORUM_MAX_BODY_CHARS),
  parentId: z.string().uuid().optional(),
});

export const createForumSolutionSchema = z.object({
  code: z.string().min(1).max(FORUM_MAX_CODE_CHARS),
  note: z.string().trim().max(8_000).optional(),
});

export const runForumChallengeSchema = z.object({
  code: z.string().min(1).max(FORUM_MAX_CODE_CHARS),
});

export function extractJavaClassName(source: string, fallback: string): string {
  const match = source.match(/\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match?.[1] ?? fallback;
}
