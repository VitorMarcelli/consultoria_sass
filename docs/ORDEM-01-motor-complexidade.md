# ORDEM DE SERVIÇO 01 — Motor de Complexidade e Desacoplamento do Diagnóstico

**Repositório:** `consultoria_sass`
**Stack:** NestJS + Prisma + PostgreSQL (multi-tenant por schema) · Next.js
**Executor:** agente de código
**Supervisão:** humana, com aprovação obrigatória nos pontos marcados 🛑

---

## 0. Leia esta seção inteira antes de escrever qualquer linha

### 0.1 Problema que esta ordem resolve

O sistema exibe "complexidade" do cliente, mas ela **não é calculada** — é um número digitado pelo consultor na planilha de importação e gravado direto no banco via `parseInt`. Não existem os critérios de avaliação, não existe classe C0–C5, não existe coeficiente de carteira, e o Diagnóstico da tela de ciclo lê a carteira a partir da tabela de entregas em vez de ler a própria carteira.

Esta ordem implementa o motor de complexidade e corrige a origem dos dados do Diagnóstico. **Não** implementa telas de avaliação, índice de atrito, nivelamento nem exportação de apresentação — isso é outra ordem.

### 0.2 Contexto de arquitetura que você precisa conhecer

**Multi-tenant por schema.** Cada escritório tem um schema PostgreSQL próprio, nomeado `tenant_<uuid com hífens trocados por underscore>`. O acesso é sempre por:

```ts
private getTenantPrisma(tenantId: string) {
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  return this.prismaManager.getClient(schemaName);
}
```

Esse helper está repetido em vários services. **Todo acesso a dado de escritório passa por ele.** Nunca use `this.prisma` (que é o schema público) para ler dado de cliente, colaborador, ciclo ou entrega.

**Não existem migrations.** O projeto usa `prisma db push`. A propagação para os schemas dos tenants é feita por `backend/push-all-schemas.ts`, que executa `npx prisma db push --accept-data-loss` no schema público e depois em cada tenant.

> 🛑 **Consequência crítica:** `--accept-data-loss` apaga dados sem perguntar. **Nenhum campo existente pode ser removido ou renomeado nesta ordem.** Só adições. Se você achar que precisa remover algo, pare e pergunte.

### 0.3 Regras invioláveis

1. **Só adicionar campos no schema.** Nunca remover, nunca renomear, nunca mudar tipo de campo existente.
2. **`ClientFrontClassification.complexity` (Int?) permanece intacto.** Ele vira campo legado. Não apague, não reaproveite, não converta.
3. **Nunca rodar `push-all-schemas.ts` nem `prisma db push`** sem aprovação humana explícita. Prepare o comando e pare.
4. **Sem hard-delete.** O projeto usa soft-delete por decisão registrada (commit `b9b54f6`). Mantenha o padrão.
5. **Isolamento de tenant é requisito de segurança.** Todo endpoint novo recebe `tenantId` e usa `getTenantPrisma`. Nunca vaze dado entre schemas.
6. **Não altere `Delivery`, `TimeLog`, `Opportunity`, `ActivityCatalog`, `TaxonomyNode`.** Fora de escopo.
7. **Se o frontend consumir um campo que você mudou de formato, atualize o frontend na mesma tarefa.** Não deixe quebrado.
8. **Toda função de cálculo deve ser pura e testável** — sem I/O, sem Prisma dentro. O service orquestra, a função calcula.

### 0.4 Protocolo de trabalho

- Execute **uma tarefa por vez**, na ordem numerada. Não pule, não agrupe.
- Ao terminar cada tarefa: rode `npm run build` no `backend/`. Se houver testes na tarefa, rode `npm test`.
- Faça **um commit por tarefa**, com mensagem no padrão do repositório (`feat(complexity): ...`, `fix(dashboard): ...`).
- Ao final de cada bloco (A, B, C, D, E), **pare e reporte** antes de seguir.
- Se encontrar ambiguidade, **pare e pergunte**. Não escolha por conta própria em regra de negócio.
- Não crie arquivos soltos na raiz do `backend/` — ela já tem ~25 scripts órfãos. Scripts novos vão em `backend/scripts/`.

---

## BLOCO A — Schema

### A1. Campos de avaliação em `ClientFrontClassification`

**Arquivo:** `backend/prisma/schema.prisma` (modelo na linha ~270)

Adicione ao modelo, **mantendo `complexity Int?` onde está**:

```prisma
model ClientFrontClassification {
  // ... campos existentes, intocados ...

  complexity  Int?    // LEGADO: valor 0-3 digitado na planilha. Não usar em cálculo novo.

  // --- Avaliação de complexidade (notas 1..3 por critério) ---
  scoreVolume       Int?     // 1, 2 ou 3
  scoreService      Int?     // Atendimento
  scoreTax          Int?     // Tributação — null na frente Pessoal (não se aplica)
  scoreOrganization Int?     // Organização

  // --- Derivados (nunca editáveis pelo usuário) ---
  rawSum           Int?      // soma dos critérios aplicáveis
  normalizedScore  Float?    // 0..100, comparável entre frentes
  complexityClass  String?   // C0, C1, C2, C3, C4, C5

  // --- Governança da avaliação ---
  assessmentState  String   @default("NOT_ASSESSED")
  volumeSource     String?  // CALCULATED | MANUAL
  volumeOverrideReason String?
  assessedById     String?
  assessedAt       DateTime?
}
```

**Valores de `assessmentState`** (String, sem enum Prisma — o projeto usa String em todos os status):

| Valor | Significado | Entra em CCA/CCR? |
|---|---|---|
| `NOT_ASSESSED` | Nenhum critério preenchido | ❌ |
| `PARTIAL` | Alguns critérios preenchidos | ❌ |
| `ASSESSED` | Completa e válida | ✅ |
| `NOT_APPLICABLE` | Frente inativa / sem movimento → C0 | ❌ |
| `IMPORTED` | Veio do campo legado `complexity`, sem critérios | ❌ |
| `AI_SUGGESTED` | Notas propostas pelo Agente de IA (`backend/src/complexity-ai`), pendentes de revisão do consultor | ❌ |

### A2. Mesmos campos em `ClientCycleSnapshot` + snapshot completo

**Arquivo:** `backend/prisma/schema.prisma` (modelo na linha ~573)

Hoje o snapshot copia apenas 7 campos e deixa de fora canais e drivers operacionais — o que impede comparar ciclos. Adicione:

```prisma
model ClientCycleSnapshot {
  // ... campos existentes, intocados ...

  // --- Avaliação congelada ---
  scoreVolume       Int?
  scoreService      Int?
  scoreTax          Int?
  scoreOrganization Int?
  rawSum            Int?
  normalizedScore   Float?
  complexityClass   String?
  assessmentState   String   @default("NOT_ASSESSED")

  // --- Responsáveis congelados (hoje ausentes) ---
  primaryOwnerId   String?
  secondaryOwnerId String?

  // --- Perfil operacional congelado ---
  operationalProfile Json?   // cópia integral de TaxInfo / HrInfo / AccountingInfo
}
```

`operationalProfile` como `Json` é deliberado: evita replicar 40 colunas e preserva o formato dos três tipos de frente. O consumo é só leitura e comparação entre ciclos.

### A3. Campos numéricos de volume

**Arquivo:** `backend/prisma/schema.prisma` (modelos nas linhas ~303 e ~343)

Os drivers de volume já são coletados, mas persistidos como `String` e nunca usados. **Adicione os campos numéricos ao lado — não converta nem remova os existentes.**

```prisma
model ClientTaxInfo {
  monthlyNotesVolume  String?   // mantido, legado
  monthlyNotesCount   Int?      // NOVO — driver numérico de volume
}

model ClientAccountingInfo {
  launchesVolume  String?   // mantido, legado
  launchesCount   Int?      // NOVO — driver numérico de volume
}
```

No Pessoal o driver já é numérico: `ClientHrInfo.employeesCount + prolaboreCount`. Não mexer.

### A4. Preparar o push (não executar)

Gere o Prisma Client (`npx prisma generate`) para o código compilar. **Não rode `prisma db push` nem `push-all-schemas.ts`.**

🛑 **PARE AQUI.** Reporte o diff do schema e aguarde aprovação antes do Bloco B.

---

## BLOCO B — Motor de cálculo

### B1. Criar o módulo

**Criar:** `backend/src/complexity/` com `complexity.module.ts`, `complexity.service.ts`, `complexity.rules.ts`, `complexity.rules.spec.ts`

`complexity.rules.ts` contém **apenas funções puras** — sem Prisma, sem injeção, sem I/O. É o arquivo que os testes cobrem.

### B2. Regras de cálculo

**Critérios por frente:**

| Frente | Critérios | Soma mín. | Soma máx. |
|---|---|---|---|
| Fiscal | Volume, Atendimento, Tributação, Organização | 4 | 12 |
| Contábil | Volume, Atendimento, Tributação, Organização | 4 | 12 |
| Pessoal | Volume, Atendimento, Organização | 3 | 9 |

**Ordem de decisão (obrigatoriamente nesta sequência):**

```
1. Frente inativa/sem movimento (actsInFront != 'YES' ou status do cliente != 'ACTIVE')
   → complexityClass = 'C0', assessmentState = 'NOT_APPLICABLE', normalizedScore = null

2. Algum critério aplicável ausente (null)
   → complexityClass = null, assessmentState = 'PARTIAL' (se ao menos um preenchido)
                                          ou 'NOT_ASSESSED' (se nenhum)
   → NUNCA converter ausência em C0, NUNCA assumir 1

3. Todos os critérios preenchidos
   → rawSum = soma dos critérios aplicáveis
   → normalizedScore = (rawSum - min) / (max - min) * 100
   → complexityClass = faixa (tabela abaixo)
   → assessmentState = 'ASSESSED'
```

**Faixas de classe** — idênticas para todas as frentes, aplicadas sobre `normalizedScore`:

| normalizedScore | Classe |
|---|---|
| 0 ≤ s ≤ 12,5 | C1 |
| 12,5 < s ≤ 37,5 | C2 |
| 37,5 < s ≤ 62,5 | C3 |
| 62,5 < s ≤ 87,5 | C4 |
| 87,5 < s ≤ 100 | C5 |

> **Por que assim:** essas faixas reproduzem **exatamente** a classificação hoje usada nas planilhas de Fiscal e Contábil (soma 4→C1, 5→C1, 6→C2, 7→C2, 8→C3, 9→C3, 10→C4, 11→C4, 12→C5) e ao mesmo tempo recalibram a frente Pessoal, que hoje usa uma escala própria e incomparável. Isso é intencional. Não "conserte" a divergência do Pessoal.

**Validação obrigatória:** o teste deve provar que Fiscal/Contábil reproduzem a tabela acima soma a soma.

### B3. Cálculo da nota de Volume

`scoreVolume` é **derivado**, não perguntado. Faixas padrão (constantes exportadas, prontas para virar parâmetro depois):

| Frente | Driver | Nota 1 | Nota 2 | Nota 3 |
|---|---|---|---|---|
| Fiscal | `ClientTaxInfo.monthlyNotesCount` | ≤ 50 | 51–200 | > 200 |
| Contábil | `ClientAccountingInfo.launchesCount` | ≤ 100 | 101–400 | > 400 |
| Pessoal | `employeesCount + prolaboreCount` | ≤ 10 | 11–50 | > 50 |

Regras:

- Driver presente → `scoreVolume` calculado, `volumeSource = 'CALCULATED'`.
- Driver ausente → `scoreVolume` aceita valor manual, `volumeSource = 'MANUAL'`. Não bloqueia.
- Valor manual quando o driver existe → exige `volumeOverrideReason` não vazio.

### B4. CCA e CCR

```
Universo: registros da frente/ciclo com assessmentState = 'ASSESSED'
Exclusões: C0, PARTIAL, NOT_ASSESSED, IMPORTED, AI_SUGGESTED

CCA (coeficiente da área)       = média de normalizedScore
CCR (coeficiente do responsável) = média de normalizedScore, filtrado por primaryOwnerId
Distância = CCR - CCA
```

Regras:

- Arredondar em 2 casas.
- Universo vazio → retornar `null`, e o frontend exibe "Não aplicável". Nunca retornar 0.
- **Só o responsável principal compõe o CCR.** O secundário nunca entra.
- Retornar junto: `coveragePercent` (avaliados ÷ ativos) e `assessedCount` / `totalActive`, para a tela poder mostrar sobre que base o número foi calculado.

**Escala de exibição opcional:** se a UI preferir a escala 1–5 familiar, use `1 + normalizedScore / 25`. Calcule no frontend; a API devolve sempre 0–100.

### B5. Testes unitários — obrigatórios

`complexity.rules.spec.ts` deve cobrir no mínimo:

| ID | Entrada | Esperado |
|---|---|---|
| CT-001 | Fiscal, ativo, notas 1,1,1,1 | rawSum 4, score 0, C1, ASSESSED |
| CT-002 | Fiscal, ativo, notas 3,3,3,3 | rawSum 12, score 100, C5, ASSESSED |
| CT-003 | Contábil, status Inativo | C0, NOT_APPLICABLE, score null |
| CT-004 | Contábil, ativo, notas 2,2,null,2 | class null, PARTIAL — **não C0** |
| CT-005 | Pessoal, ativo, notas 1,1,1 | rawSum 3, score 0, C1 |
| CT-006 | Pessoal, ativo, notas 3,3,3 | rawSum 9, score 100, C5 |
| CT-011 | Fiscal somas 4..12 | reproduz a tabela da seção B2 integralmente |
| CT-012 | Fiscal 2,2,2,2 e Pessoal 2,2,2 | mesmo normalizedScore (50) — comparabilidade entre frentes |
| CT-013 | CCA com 1 registro ASSESSED e 3 PENDENTES | média só do ASSESSED; coveragePercent = 25 |
| CT-014 | CCR com principal A e secundário B | registro conta só para A |
| CT-015 | Universo vazio | CCA = null, não 0 |
| CT-016 | Volume driver 180 notas (Fiscal) | scoreVolume 2, volumeSource CALCULATED |
| CT-017 | Volume manual com driver presente e sem justificativa | erro de validação |

🛑 **PARE AQUI.** Reporte a saída de `npm test` e aguarde aprovação.

---

## BLOCO C — Importador

**Arquivo:** `backend/src/imports/imports.service.ts` (trecho em ~linha 139)

### C1. Parar de aceitar classe digitada

Hoje:

```ts
const complexityStr = getVal([`${prefix} - Complexidade`]);
const parsedComplexity = complexityStr ? parseInt(String(complexityStr)) : null;
// ... grava direto em complexity
```

Novo comportamento:

- O valor lido da coluna `Complexidade` vai para o campo **legado** `complexity` e marca `assessmentState = 'IMPORTED'`.
- **Nunca** preencher `complexityClass`, `normalizedScore` ou `rawSum` a partir dessa coluna.
- Registros `IMPORTED` **não entram** em CCA/CCR (a regra do B4 já garante).

### C2. Ler as notas quando existirem

Se o arquivo trouxer as colunas `{prefix} - Nota Volume`, `- Nota Atendimento`, `- Nota Tributação`, `- Nota Organização`, gravar nos campos de score e chamar o motor do Bloco B para derivar classe e estado. Colunas ausentes não são erro.

Validação: nota fora de {1,2,3} rejeita a linha com mensagem indicando arquivo, linha, campo e motivo.

### C3. Volumes numéricos

Ao ler `Fiscal - Volume de notas/mês` e `Contábil - Total de lançamentos`:

- continuar gravando o texto original nos campos `String` existentes (legado intacto);
- **adicionalmente**, extrair o número e gravar em `monthlyNotesCount` / `launchesCount`;
- valor não numérico → deixa `null` e gera **aviso**, não erro.

### C4. Recalcular após importar

Ao fim da importação de cada frente, chamar o motor e persistir os derivados. A importação nunca grava classe sem passar pelo cálculo.

🛑 **PARE AQUI.** Reporte com um teste de importação de arquivo real (`docs_cliente/modelo_importacao_completo (1).xlsx`).

---

## BLOCO D — Diagnóstico

**Arquivo:** `backend/src/dashboard/dashboard.service.ts`, método `getCycleMapping` (~linha 31)

### D1. Ler da carteira, não das entregas

Hoje o método monta a lista de clientes assim:

```ts
const deliveries = await tenantPrisma.delivery.findMany({ where: { frontId, competence } });
// ... uniqueClientsMap a partir de deliveries
```

**Isso é o bug central:** o Raio-X da carteira só enxerga clientes que já têm entrega cadastrada no ciclo. Um escritório com 250 clientes importados e nenhuma entrega vê um diagnóstico vazio.

Novo comportamento — ler nesta ordem de precedência:

1. `ClientCycleSnapshot` do ciclo/frente, se existir (é o retrato congelado);
2. senão, `ClientFrontClassification` com `actsInFront = 'YES'` da frente, com join em `Client`.

`Delivery` deixa de participar deste método.

### D2. Trocar prioridade por complexidade real

Hoje o cruzamento por colaborador usa:

```ts
// Usaremos prioridade como métrica de complexidade provisória
const priorityLevel = d.priority === 'HIGH' ? '3' : d.priority === 'MEDIUM' ? '2' : '1';
```

Substituir por `complexityClass` do registro de carteira. Remover o comentário e a heurística.

### D3. Trocar o responsável

Hoje agrupa por `d.responsible` (responsável da **entrega**). Passar a agrupar pelo **responsável principal da frente** (`operator1Id` no modelo atual). Se a decisão for renomear para `primaryOwnerId`, faça em tarefa separada com atualização do frontend — **não renomeie neste bloco**.

### D4. Novo formato de retorno

```ts
{
  coverage: { totalClients, activeClients, assessedClients, coveragePercent },
  statusData: { ativos, inativos, semMovimento, total },
  taxRegimes: [{ name, value }],
  segments:   [{ name, value }],
  complexityCurve: [            // C0 fora do cálculo, exibido à parte
    { class: 'C1', count, percent }, ... { class: 'C5', count, percent }
  ],
  c0Count, pendingCount,
  cca: number | null,
  byOwner: [
    { ownerId, ownerName, total, byClass: { C1, C2, C3, C4, C5 }, ccr, distance }
  ]
}
```

`distance = ccr - cca`, `null` quando qualquer um dos dois for `null`.

### D5. Frontend

**Arquivo:** `frontend/src/app/(dashboard)/escritorios/[id]/ciclos/[cycleId]/page.tsx`

Ajustar o bloco Diagnóstico ao novo contrato. Exibir, junto do gráfico, a base de cálculo: `"Calculado sobre X de Y clientes ativos (Z% de cobertura)"`. Pendentes e C0 aparecem separados da curva, nunca somados a C1.

🛑 **PARE AQUI.** Reporte com print da tela antes e depois.

---

## BLOCO E — Capacidade (correção mínima)

**Arquivo:** `backend/src/dashboard/dashboard.service.ts`, método `getCapacityPlanning` (~linha 102)

Hoje:

```ts
const dailyHours = alloc.dailyAvailableTime || 6; // Default to 6 hours
```

O default entra silenciosamente e o denominador da capacidade vira chute — sem que a tela avise.

**Alterar apenas isto:** manter o fallback, mas devolver no payload de cada colaborador:

```ts
hasExplicitAvailability: alloc.dailyAvailableTime != null
```

E no agregado, `employeesWithoutAvailability: number`. O frontend exibe um aviso quando houver algum. **Não** implemente a tela de preenchimento de disponibilidade nesta ordem.

---

## Fora de escopo (não faça, mesmo que pareça útil)

- Tela de avaliação de complexidade e fila por operador
- Índice de atrito operacional e categorias canônicas de canais
- Nivelamento / Heijunka e tempos padrão por entrega
- Exportação de apresentação (PDF/PPTX)
- Renomear `operator1Id`/`operator2Id`
- Tornar `Client.cnpj` obrigatório
- Limpar os scripts órfãos da raiz do `backend/`
- Qualquer alteração em `Delivery`, `TimeLog`, `Opportunity`

---

## Critérios de aceite da ordem

| ID | Critério | Como verificar |
|---|---|---|
| AC-01 | Nenhum campo removido ou renomeado no schema | `git diff` em `schema.prisma` — só adições |
| AC-02 | `npm run build` passa no backend | terminal |
| AC-03 | 100% dos casos CT-001 a CT-017 passam | `npm test` |
| AC-04 | Importar arquivo real não grava classe calculada a partir da coluna Complexidade | inspecionar registros: `assessmentState = 'IMPORTED'`, `complexityClass = null` |
| AC-05 | Diagnóstico exibe a carteira em escritório com 0 entregas no ciclo | testar em ciclo sem entregas |
| AC-06 | Curva de complexidade não soma C0 nem pendentes em C1 | conferir contra o banco |
| AC-07 | CCA e CCR excluem C0, pendentes e importados | caso controlado |
| AC-08 | Responsável secundário não compõe CCR | CT-014 |
| AC-09 | Fiscal 2,2,2,2 e Pessoal 2,2,2 produzem o mesmo score | CT-012 |
| AC-10 | Nenhum acesso a dado de tenant fora de `getTenantPrisma` | revisão do diff |

---

## Entregável final do agente

1. Diff completo por bloco, com um commit por tarefa.
2. Saída de `npm test` e `npm run build`.
3. Comando de push preparado **e não executado**, com a lista de tenants que serão afetados.
4. Lista do que foi encontrado e **não** corrigido por estar fora de escopo.
