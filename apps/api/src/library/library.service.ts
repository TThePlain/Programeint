import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { RESOURCES, resourceMatchesContext } from "@programeint/database";
import { licenseInfo, resourceIsListable } from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  loadScopedGraph,
  resolveCurriculumContext,
} from "../curriculum/curriculum-context";

type ResourceRow = {
  slug: string;
  title: string;
  url: string;
  publisher: string;
  kind: string;
  license: string;
  language: string;
  summary: string;
  official: boolean;
  lastCheckedAt: Date | null;
  lastStatus: number | null;
  nodes: Array<{ node: { slug: string; title: string; goalId: string | null } }>;
};

const GENERIC_GOAL_SLUGS = new Set(["custom", "outro", "other", ""]);

@Injectable()
export class LibraryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private present(resource: ResourceRow) {
    const license = licenseInfo(resource.license);
    return {
      slug: resource.slug,
      title: resource.title,
      url: resource.url,
      publisher: resource.publisher,
      kind: resource.kind,
      language: resource.language,
      summary: resource.summary,
      license: {
        id: resource.license,
        label: license?.label ?? resource.license,
        url: license?.url ?? null,
        redistributable: license?.redistributable ?? false,
      },
      nodes: resource.nodes.map((link) => ({
        slug: link.node.slug,
        title: link.node.title,
      })),
      lastCheckedAt: resource.lastCheckedAt?.toISOString() ?? null,
      lastStatus: resource.lastStatus,
    };
  }

  private async listPublished(where: Record<string, unknown>, nodeIds?: string[]) {
    const rows = await this.prisma.learningResource.findMany({
      where: {
        published: true,
        ...where,
        ...(nodeIds ? { nodes: { some: { nodeId: { in: nodeIds } } } } : {}),
      },
      orderBy: [{ title: "asc" }],
      include: {
        nodes: {
          include: { node: { select: { slug: true, title: true, goalId: true } } },
          ...(nodeIds ? { where: { nodeId: { in: nodeIds } } } : {}),
        },
      },
    });

    return rows.filter((row) => resourceIsListable(row)).map((row) => this.present(row));
  }

  async list(userId: string, nodeSlug?: string, kind?: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    const kindFilter = kind ? { kind } : {};

    if (!ctx.available) {
      return {
        policy: policyText(),
        goal: goalMeta(ctx),
        items: [] as ReturnType<LibraryService["present"]>[],
        message: ctx.message ?? "Define um objectivo para ver a biblioteca desse objectivo.",
      };
    }

    const graph = await loadScopedGraph(this.prisma, ctx.scopeGoalId);
    const scopeNodeIds = new Set(graph.nodes.map((node) => node.id));
    const primary = ctx.goal.targets.find((t) => t.isPrimary)?.slug ?? "";

    if (nodeSlug) {
      const node = graph.nodes.find((n) => n.slug === nodeSlug);
      if (!node || !scopeNodeIds.has(node.id)) {
        return {
          policy: policyText(),
          goal: goalMeta(ctx),
          items: [] as ReturnType<LibraryService["present"]>[],
          message: "Este nó não pertence ao objectivo em foco.",
        };
      }
      return {
        policy: policyText(),
        goal: goalMeta(ctx),
        filterNode: { slug: node.slug, title: node.title },
        items: await this.listPublished(kindFilter, [node.id]),
      };
    }

    let items =
      scopeNodeIds.size > 0
        ? await this.listPublished(kindFilter, [...scopeNodeIds])
        : [];

    // Fallback só para objectivos de catálogo conhecidos (java, python, …) — nunca "custom"
    if (
      items.length === 0 &&
      primary &&
      !GENERIC_GOAL_SLUGS.has(primary.toLowerCase()) &&
      ctx.goal.curriculumSource !== "generated"
    ) {
      items = await this.listByGoalFallback(primary, kind);
    }

    return {
      policy: policyText(),
      goal: goalMeta(ctx),
      items,
    };
  }

  private async listByGoalFallback(primarySlug: string, kind?: string) {
    const matchingSlugs = RESOURCES.filter((item) =>
      resourceMatchesContext(item, { goalSlug: primarySlug, haystack: primarySlug }),
    ).map((item) => item.slug);

    if (matchingSlugs.length === 0) return [];

    const rows = await this.prisma.learningResource.findMany({
      where: {
        published: true,
        slug: { in: matchingSlugs },
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ title: "asc" }],
      include: {
        nodes: { include: { node: { select: { slug: true, title: true, goalId: true } } } },
      },
    });
    return rows.filter((row) => resourceIsListable(row)).map((row) => this.present(row));
  }

  async forNode(userId: string, nodeSlug: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      throw new NotFoundException("Objectivo activo necessário para a biblioteca.");
    }
    const graph = await loadScopedGraph(this.prisma, ctx.scopeGoalId);
    const node = graph.nodes.find((n) => n.slug === nodeSlug);
    if (!node) throw new NotFoundException("Nó não existe neste objectivo.");

    return {
      node: { slug: node.slug, title: node.title },
      goal: goalMeta(ctx),
      items: await this.listPublished({}, [node.id]),
    };
  }
}

function policyText() {
  return "Biblioteca isolada por objectivo: só recursos dos nós do mapa activo. Outros objectivos não aparecem aqui. Liga à fonte; não alojamos o conteúdo.";
}

function goalMeta(ctx: Awaited<ReturnType<typeof resolveCurriculumContext>>) {
  if (!ctx.available) {
    return {
      available: false as const,
      message: ctx.message,
      generating: Boolean(ctx.generating),
    };
  }
  const primary = ctx.goal.targets.find((t) => t.isPrimary);
  return {
    available: true as const,
    statement: ctx.goal.statement,
    primaryTarget: primary ? { slug: primary.slug, label: primary.label } : null,
    curriculumSource: ctx.goal.curriculumSource,
  };
}
