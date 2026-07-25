import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.taxonomyNode.findMany({ orderBy: { path: 'asc' } });
  }

  async getTree() {
    const nodes = await this.findAll();
    const byId = new Map(
      nodes.map((n) => [n.id, { ...n, children: [] as any[] }]),
    );
    const roots: any[] = [];
    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async listChildren(parentId: string | null) {
    return this.prisma.taxonomyNode.findMany({
      where: { parentId: parentId ?? null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const node = await this.prisma.taxonomyNode.findUnique({ where: { id } });
    if (!node) throw new NotFoundException('Nó de taxonomia não encontrado.');
    return node;
  }

  // Único ponto de resolução cross-schema: ActivityCatalog (nos schemas de
  // tenant) guarda taxonomyNodeId como string solta, sem @relation, então
  // todo consumidor (catálogo, futuros relatórios) deve buscar os nós aqui.
  async resolveNodes(ids: (string | null | undefined)[]) {
    const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))];
    if (!uniqueIds.length) return [];
    return this.prisma.taxonomyNode.findMany({
      where: { id: { in: uniqueIds } },
    });
  }

  // Cadeia completa raiz -> folha (inclusive o próprio nó), usada por quem
  // precisa mapear a classificação em níveis (ex: deliveryGroup/deliveryType
  // legados em Delivery). `path` guarda só os ids ancestrais.
  async getBreadcrumb(nodeId: string) {
    const node = await this.findOne(nodeId);
    const ancestorIds = node.path.split('/').filter(Boolean);
    const fullChainIds = [...ancestorIds, node.id];
    const nodes = await this.resolveNodes(fullChainIds);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return fullChainIds
      .map((id) => byId.get(id))
      .filter((n): n is (typeof nodes)[number] => !!n);
  }

  async create(data: { name: string; parentId?: string | null }) {
    let path = '/';
    if (data.parentId) {
      const parent = await this.findOne(data.parentId);
      if (parent.status !== 'ACTIVE') {
        throw new ConflictException(
          'Não é possível criar um nó sob um nó inativo.',
        );
      }
      path = `${parent.path}${parent.id}/`;
    }
    return this.prisma.taxonomyNode.create({
      data: { name: data.name, parentId: data.parentId || null, path },
    });
  }

  async update(id: string, data: { name?: string; status?: string }) {
    // parentId propositalmente não é aceito aqui: mover um nó de lugar
    // exigiria recalcular o `path` de toda a subárvore — fora do escopo
    // desta leva (ver plano).
    await this.findOne(id);
    return this.prisma.taxonomyNode.update({
      where: { id },
      data: { name: data.name, status: data.status },
    });
  }

  async deactivate(id: string) {
    // Nunca hard-delete: sem FK real cross-schema, apagar um nó deixaria
    // ActivityCatalog.taxonomyNodeId órfão e silencioso em escritórios que
    // apontam pra ele. Desativar é a única forma de "remover" um nó.
    await this.findOne(id);
    return this.prisma.taxonomyNode.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
