import { Injectable } from '@nestjs/common';
import {
  CATALOG_FIELDS,
  CATALOG_SOURCE,
} from './client-catalog.data';
import {
  CatalogBlock,
  CatalogField,
  ComplexityFront,
  COMPLEXITY_FRONTS,
} from './client-catalog.types';
import { fieldsForIndex } from '../complexity/cc-co.rules';

// Serve o catálogo de domínios do cadastro de clientes. É estático e igual
// para todos os escritórios — vem da planilha do cliente, não do banco —,
// então não recebe tenantId nem toca em Prisma.
//
// Existe para que formulário, importador, motor e IA leiam a MESMA fonte.
// Antes destas listas viverem aqui, cada consumidor tinha a sua cópia e elas
// divergiam (ORDEM-02 §1.3).
@Injectable()
export class ClientCatalogService {
  getSource() {
    return CATALOG_SOURCE;
  }

  getAllFields(): CatalogField[] {
    return CATALOG_FIELDS;
  }

  getFieldsByBlock(block: CatalogBlock): CatalogField[] {
    return CATALOG_FIELDS.filter((f) => f.block === block);
  }

  getField(key: string): CatalogField | undefined {
    return CATALOG_FIELDS.find((f) => f.key === key);
  }

  // Estrutura pronta para montar o wizard: o bloco MESTRE mais um bloco por
  // frente. A tela decide quais frentes exibir a partir dos switches de
  // escopo contratado.
  getFormStructure() {
    return {
      source: CATALOG_SOURCE,
      blocks: [
        { block: 'MESTRE', fields: this.getFieldsByBlock('MESTRE') },
        ...COMPLEXITY_FRONTS.map((front) => ({
          block: front,
          fields: this.getFieldsByBlock(front),
        })),
      ],
    };
  }

  // Quais campos compõem cada índice em cada frente. A tela usa isto para
  // dizer quantas respostas faltam para a avaliação fechar.
  getIndexComposition() {
    return COMPLEXITY_FRONTS.map((front: ComplexityFront) => ({
      front,
      cc: fieldsForIndex(front, 'cc').map((f) => ({
        key: f.key,
        label: f.label,
      })),
      co: fieldsForIndex(front, 'co').map((f) => ({
        key: f.key,
        label: f.label,
      })),
    }));
  }
}
