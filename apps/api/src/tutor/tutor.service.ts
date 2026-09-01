import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  TUTOR_BLOCKED,
  aiTutorReady,
  tutorSystemPrompt,
  type TutorHelpLevel,
  type TutorTurn,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { AI_PROVIDER_ERROR, AiProviderError, createAiProvider } from "./provider";

const BLOCKED_MESSAGE =
  "O AI Tutor não está configurado (AI_API_KEY). Sem chave real não há resposta gerada — nada é simulado.";

const READY_MESSAGE =
  "As respostas vêm de um modelo externo e podem estar erradas. Confirma sempre com a execução dos testes.";

const HISTORY_TURNS = 10;
const MAX_LAB_FILES = 8;
const MAX_LAB_CHARS = 12_000;

@Injectable()
export class TutorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private settings() {
    return {
      apiKey: this.config.get<string>("AI_API_KEY") ?? "",
      baseUrl: this.config.get<string>("AI_BASE_URL") ?? "",
      model: this.config.get<string>("AI_MODEL") ?? "",
    };
  }

  private configured() {
    return aiTutorReady(this.settings().apiKey);
  }

  status() {
    const configured = this.configured();
    return {
      configured,
      model: configured ? (this.settings().model || "gpt-4o-mini") : null,
      errorCode: configured ? null : TUTOR_BLOCKED,
      message: configured ? READY_MESSAGE : BLOCKED_MESSAGE,
      helpLevels: [0, 1, 2, 3, 4, 5, 6],
    };
  }

  private async nodeOrFail(slug: string) {
    const node = await this.prisma.knowledgeNode.findUnique({
      where: { slug },
      include: {
        learningModule: true,
        labExercises: { where: { published: true }, select: { id: true, slug: true } },
      },
    });
    if (!node) throw new NotFoundException("Nó não existe no grafo.");
    return node;
  }

  private async loadLabFiles(userId: string, exerciseIds: string[]) {
    if (exerciseIds.length === 0) return null;
    const workspace = await this.prisma.labWorkspace.findFirst({
      where: { userId, exerciseId: { in: exerciseIds } },
      include: { files: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!workspace || workspace.files.length === 0) return null;

    let total = 0;
    const files: Array<{ path: string; content: string }> = [];
    for (const file of workspace.files.slice(0, MAX_LAB_FILES)) {
      const room = MAX_LAB_CHARS - total;
      if (room <= 0) break;
      const content = file.content.length > room ? `${file.content.slice(0, room)}\n…` : file.content;
      total += content.length;
      files.push({ path: file.path, content });
    }
    return files;
  }

  async thread(userId: string, nodeSlug: string) {
    const node = await this.nodeOrFail(nodeSlug);
    const conversation = await this.prisma.tutorConversation.findUnique({
      where: { userId_nodeId: { userId, nodeId: node.id } },
      include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });

    return {
      ...this.status(),
      node: { slug: node.slug, title: node.title },
      hasLab: node.labExercises.length > 0,
      messages: (conversation?.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        helpLevel: message.helpLevel,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }

  async ask(
    userId: string,
    nodeSlug: string,
    content: string,
    helpLevel: TutorHelpLevel,
    includeLabCode: boolean,
  ) {
    if (!this.configured()) {
      throw new HttpException(
        { code: TUTOR_BLOCKED, message: BLOCKED_MESSAGE },
        HttpStatus.CONFLICT,
      );
    }

    const node = await this.nodeOrFail(nodeSlug);
    await this.redis.consumeToken(`rl:tutor:${userId}`, 30, 3600);

    const conversation = await this.prisma.tutorConversation.upsert({
      where: { userId_nodeId: { userId, nodeId: node.id } },
      create: { userId, nodeId: node.id },
      update: {},
      include: { messages: { orderBy: { createdAt: "desc" }, take: HISTORY_TURNS } },
    });

    const provider = createAiProvider(this.settings());
    if (!provider) {
      throw new HttpException(
        { code: TUTOR_BLOCKED, message: BLOCKED_MESSAGE },
        HttpStatus.CONFLICT,
      );
    }

    const labFiles =
      includeLabCode && node.labExercises.length > 0
        ? await this.loadLabFiles(
            userId,
            node.labExercises.map((item) => item.id),
          )
        : null;

    const history: TutorTurn[] = [...conversation.messages]
      .reverse()
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));

    const turns: TutorTurn[] = [
      {
        role: "system",
        content: tutorSystemPrompt({
          nodeTitle: node.title,
          nodeSummary: node.summary,
          moduleSummary: node.learningModule?.summary ?? null,
          hasLab: node.labExercises.length > 0,
          helpLevel,
          labFiles,
        }),
      },
      ...history,
      { role: "user", content },
    ];

    let completion;
    try {
      completion = await provider.complete(turns);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw new HttpException(
          { code: AI_PROVIDER_ERROR, message: error.message },
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw error;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tutorMessage.create({
        data: { conversationId: conversation.id, role: "user", content, helpLevel },
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await tx.tutorMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: completion.content,
          helpLevel,
          model: completion.model,
          promptTokens: completion.promptTokens,
          completionTokens: completion.completionTokens,
        },
      });
      await tx.tutorConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    });

    return this.thread(userId, nodeSlug);
  }
}
