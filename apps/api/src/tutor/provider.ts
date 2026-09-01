import { aiTutorReady, type TutorTurn } from "@programeint/shared";

export const AI_PROVIDER_ERROR = "AI_PROVIDER_ERROR";

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

export type TutorCompletion = {
  content: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

export interface AiProvider {
  readonly model: string;
  complete(turns: TutorTurn[]): Promise<TutorCompletion>;
}

export type AiProviderSettings = {
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  timeoutMs?: number;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 30_000;

type ChatCompletionBody = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

/** Fala com qualquer endpoint compatível com `POST /chat/completions` da OpenAI. */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(settings: AiProviderSettings) {
    this.apiKey = settings.apiKey?.trim() ?? "";
    this.baseUrl = (settings.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.model = settings.model?.trim() || DEFAULT_MODEL;
    this.timeoutMs = settings.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async complete(turns: TutorTurn[]): Promise<TutorCompletion> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: turns.map((turn) => ({ role: turn.role, content: turn.content })),
          temperature: 0.2,
          max_tokens: 700,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AiProviderError(
        `Não foi possível falar com o provider de IA: ${(error as Error).message}`,
      );
    }

    const body = (await response.json().catch(() => ({}))) as ChatCompletionBody;

    if (!response.ok) {
      throw new AiProviderError(
        body.error?.message ?? `O provider de IA respondeu ${response.status}.`,
      );
    }

    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiProviderError("O provider de IA devolveu uma resposta vazia.");
    }

    return {
      content,
      model: body.model ?? this.model,
      promptTokens: body.usage?.prompt_tokens ?? null,
      completionTokens: body.usage?.completion_tokens ?? null,
    };
  }
}

export function createAiProvider(settings: AiProviderSettings): AiProvider | null {
  if (!aiTutorReady(settings.apiKey)) return null;
  return new OpenAiCompatibleProvider(settings);
}
