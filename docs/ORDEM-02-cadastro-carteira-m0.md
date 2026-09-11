# ORDEM DE SERVIÇO 02 — Cadastro de Carteira (M0) e Complexidade CC/CO

**Repositório:** `consultoria_sass`
**Data:** 07/09/2026
**Origem:** três pontos levantados pelo cliente + análise do template `docs/Sistema - Base de Cadastro de Clientes.xlsx` (revisão de 03/09/2026)
**Status:** especificação — nenhuma linha de código alterada
**Ordem anterior:** `docs/ORDEM-01-motor-complexidade.md`

---

## 0. Resumo executivo

Três problemas foram levantados. Eles não são independentes — são o mesmo problema visto de três ângulos:

| # | Sintoma relatado | Causa real |
|---|---|---|
| 1 | O formulário "Novo Cliente" não reflete o template | O cadastro nunca foi derivado do template; foi construído antes dele |
| 2 | O cadastro "tem muito a ver" com a complexidade | O cadastro **é** a entrada do motor de complexidade — é o Output do M0 |
| 3 | A complexidade aparece como nível 1 e muda quando editada à mão | A tela lê o campo **legado** `complexity` (1–3, digitado) em vez do calculado `complexityClass` (C0–C5) |

A raiz comum: **o campo `ClientFrontClassification.complexity` (legado) continua vivo na interface**, enquanto o motor calculado da ORDEM-01 já existe, roda e grava — mas quase ninguém o exibe. O cadastro, por sua vez, não coleta os parâmetros que esse motor precisa.

Resolver o ponto 3 sem resolver o ponto 1 produz uma tela honesta e vazia (a complexidade ficaria corretamente "não avaliada" para quase toda a carteira). Por isso a ordem de execução proposta é **3 → 1 → 2**: o bug é independente e pode ser corrigido de imediato; o cadastro é o que dá conteúdo à tela corrigida.

---

## 1. PONTO 1 — O formulário de cadastro não reflete o template

### 1.1 Onde está

O modal da imagem é `frontend/src/app/(dashboard)/escritorios/[id]/ciclos/[cycleId]/clientes/ClientCycleModal.tsx`
(há um segundo modal, `frontend/src/components/ClientModal.tsx`, com os mesmos campos e sem alocação de frente — ver §1.5).

- **Passo 1 de 2** — "Dados da Empresa": 11 campos
- **Passo 2 de 2** — "Alocação de escopo": seleção de frente + `frontend/src/components/FrontClassificationForm.tsx`

O template define **50 campos** em 4 blocos (MESTRE 16 · FISCAL 9 · CONTÁBIL 12 · PESSOAL 13).

### 1.2 Lacunas do bloco MESTRE (Passo 1)

| # | Campo do template | Tipo | Situação atual | Ação |
|---|---|---|---|---|
| 1 | Data de Início (Operação) | Data | **ausente na tela** (schema já tem `Client.entryDate`) | expor campo |
| 2 | Ciclo (AAAA-MM) | Data | implícito no `cycleId` da rota | exibir como somente-leitura no cabeçalho |
| 3 | CNPJ/CPF | Máscara | só CNPJ; `handleNextStep` **rejeita** o que não tiver 14 dígitos | aceitar CPF (11) e CNPJ (14) |
| 4 | Perfil do Cliente | Lista (4) | **ausente** (schema tem `personType`, não usado na tela) | criar lista |
| 5 | Razão social/Nome | Texto | ✅ `name` | ajustar rótulo (contempla PF) |
| 6 | Nome fantasia | Texto | ✅ `tradeName` | — |
| 7 | Status contrato | Lista (3) | ⚠️ só Ativo/Inativo | adicionar **Sem Movimento** |
| 8 | Segmento | Lista (15) | ⚠️ **texto livre** | fechar em lista |
| 9 | Regime tributário | Lista (5) | ⚠️ 3 opções (falta Imune ou Isenta e Regime Especial) | completar lista |
| 10 | Honorário faturado | Valor | ✅ `monthlyFee` | ajustar rótulo ("faturado no ciclo") |
| 11 | Faixa faturamento anual | Lista (6) | ⚠️ **texto livre** | fechar em lista |
| 12 | Classificação A-D | Lista (4) | ⚠️ só A/B/C | adicionar **D** |
| 13 | Fiscal? | Switch | **ausente** | criar |
| 14 | Contábil? | Switch | **ausente** | criar |
| 15 | Pessoal? | Switch | **ausente** | criar |
| 16 | Observações - Gerais | Texto | ✅ `observations` | — |

**Placar:** 5 campos ausentes · 5 campos com domínio errado · 6 corretos.

**Campos hoje na tela que não existem no template:** `Pertence a Grupo Empresarial?` e `Nome do Grupo Empresarial`.
→ **Recomendação: manter**, marcados como *Cadastro / Controle* (não pontuam em nenhum índice). São dado cadastral útil e removê-los destruiria informação já preenchida.

### 1.3 Por que "texto livre" é um defeito e não um detalhe

`Segmento`, `Faixa de Faturamento` e `Regime Tributário` alimentam três consumidores que dependem de igualdade exata de string:

1. `backend/src/dashboard/dashboard.service.ts` — agrupa a carteira por `taxRegime` e `segment` brutos;
2. `backend/src/deliveries/deliveries.service.ts:609` — casa template de obrigação por `t.taxRegime === clientRegime`, com fallback silencioso para `'Simples Nacional'`;
3. **o motor CC** — `Regime tributário` e `Faixa faturamento anual` são duas das notas de Complexidade do Cliente.

Com texto livre, "Simples nacional" não casa com "Simples Nacional": o cliente cai no regime errado, recebe as obrigações erradas e **não recebe nota de CC**.

### 1.4 Lacunas dos blocos de frente (Passo 2)

O `FrontClassificationForm` atual coleta campos que **não estão no template** (Sistema Fiscal, Plataforma de Notas, Formas NFe, Nível de Automação, Cumpre Prazos, Tipo de Processamento…) e **não coleta** os que o template exige.

| Frente | O que o template exige | Situação |
|---|---|---|
| FISCAL | Resp. principal/secundário, Forma recebimento, Forma envio, Forma integração, Nota Volume, Nota Atendimento, Nota Organização, Observações | 3 de 9 existem |
| CONTÁBIL | + Forma de lançamento, Periodicidade de Fechamento, Último Mês de Conciliação, Nota Volume/Atendimento/Organização | 4 de 12 existem |
| PESSOAL | Qtd. Funcionários/Pró-labores/Domésticas, **Total de Vínculos (calculado)**, Recebimento documentos, Recebimento ponto, Envio documentos, Nota Atendimento/Organização/Rotatividade | 4 de 13 existem |

**Ponto crítico:** as **Notas** (Volume, Atendimento, Organização, Rotatividade) não têm campo de entrada em lugar nenhum da interface hoje. Elas só chegam ao banco por importação de planilha ou por sugestão da IA. É por isso que a carteira fica presa em `NOT_ASSESSED`.

### 1.5 Solução recomendada

**S1.1 — Unificar os dois modais.** `ClientModal.tsx` e `ClientCycleModal.tsx` duplicam os mesmos 11 campos e vão divergir na primeira manutenção. Um único componente com a alocação de frente opcional.

**S1.2 — Centralizar os domínios em um único módulo.** Criar um catálogo de domínios no backend exportando as listas do template como constantes tipadas, servido por endpoint ao frontend. Motivo: as mesmas listas são usadas pelo formulário, pelo importador, pelo motor de complexidade e pela IA. Duplicá-las em quatro lugares garante divergência.

**S1.3 — Reestruturar o wizard em 4 passos**, espelhando os blocos do template:

```
Passo 1 · MESTRE     → identificação, contrato, porte, regime, switches de frente
Passo 2 · FISCAL     → só se "Fiscal? = Sim"
Passo 3 · CONTÁBIL   → só se "Contábil? = Sim"
Passo 4 · PESSOAL    → só se "Pessoal? = Sim"
```

Os switches do Passo 1 controlam quais passos aparecem — é exatamente a semântica de "Gatilho" do template, e evita o formulário gigante que o cliente pediu para não criar ("não fique complexo, mas completo").

**S1.4 — Mostrar o índice enquanto se preenche.** Ao fim de cada passo de frente, exibir CC e CO parciais com a contagem de notas faltantes ("CC 3,4 · calculado sobre 4 de 5 notas"). Transforma o preenchimento em algo com retorno imediato em vez de burocracia.

**S1.5 — Migração dos campos fora do template.** Os campos hoje coletados que o template não prevê (Sistema Fiscal, Plataforma de Notas, etc.) **não devem ser apagados** — o schema não permite remoção segura (`db push --accept-data-loss`). Recomendação: movê-los para uma seção recolhida "Dados complementares", marcada como não pontuante.

---

## 2. PONTO 2 — O cadastro é o Output do M0

### 2.1 Posicionamento no roadmap

No mapa de fases, este cadastro é a entrega:

> **M0 · Mapeamento da Operação · Cadastro de Carteira de Clientes dos Escritórios (v1)** — Ferramenta Interna

Isso não é rótulo organizacional. Tem três consequências de contrato:

**C1 — O cadastro não é um fim, é a entrada de um cálculo.** Cada campo do template existe porque alimenta CC, CO, elegibilidade ou controle. A coluna `CLASSIFICAÇÃO PARA COMPLEXIDADE` do template diz explicitamente qual é o papel de cada um. Um campo que não se encaixa em nenhum dos quatro papéis não deveria estar no formulário.

**C2 — O output do M0 é o insumo do M1.** As entregas seguintes (`M0 Painel de Performance v1`, `M1 Cadastro de Entregas`, `M1 Cadastro de Tempos`, `M1 Painel de Oportunidades`) consomem a carteira mapeada. Um cadastro incompleto trava a cadeia inteira: sem regime normalizado não há geração de obrigações; sem responsável por frente não há alocação de tempo; sem CC/CO não há painel de performance.

**C3 — "v1" implica que existirá "v2".** O roadmap prevê `M7 · Cadastro de Clientes (v2)` já como **Produto Assistido** (o escritório preenche, não o consultor). Portanto a modelagem de agora precisa suportar dois modos de preenchimento — consultor e cliente final — sem reescrita. Na prática: separar o *schema de domínio* da *tela*, que é o que a solução S1.2 propõe.

### 2.2 Onde o encaixe está quebrado hoje

| Elo da cadeia | Estado |
|---|---|
| Cadastro → CC/CO | ❌ o cadastro não coleta as notas |
| Cadastro → geração de obrigações | ⚠️ funciona por string exata, com fallback silencioso |
| Cadastro → alocação de tempo | ⚠️ só `operator1Id`; o template pede principal + secundário por frente |
| Cadastro → Painel de Performance | ❌ o painel lê o campo legado (ver Ponto 3) |

### 2.3 Solução recomendada

**S2.1 — Declarar o contrato do M0 no código.** Um teste de integração que garanta: "cliente cadastrado com todos os campos do template produz CC e CO calculados nas três frentes, sem estado `NOT_ASSESSED`". É o critério de aceite objetivo da entrega M0, e protege contra regressão silenciosa quando o template evoluir.

**S2.2 — Indicador de completude da carteira.** Na tela de clientes do ciclo, exibir "X de Y clientes com mapeamento completo". O M0 só está entregue quando esse número fecha — e o consultor precisa enxergar o quanto falta.

**S2.3 — Versionar o template.** O template já mudou uma vez (03/09) e alterou notas de canais. Gravar em cada avaliação a versão do template usada, como já é feito com `aiSuggestion.promptVersion`. Sem isso, a série histórica de CO fica incomparável e ninguém sabe por quê.

---

## 3. PONTO 3 — BUG: complexidade exibida como nível 1–3 e alterável à mão

### 3.1 Reprodução

1. Abrir o painel lateral de um cliente → aba **Operacional**
2. O bloco "Mapeamento de Escopo" mostra **NÍVEL DE COMPLEXIDADE** com 3 barras
3. Abrir configuração da frente → alterar **"Percepção de Complexidade"** → salvar
4. A barra muda

Comportamento esperado: a barra reflete a classe calculada (C0–C5) e **não** é editável à mão.

### 3.2 Causa raiz — três ocorrências do mesmo defeito

O motor da ORDEM-01 calcula e **grava corretamente** `complexityClass`, `normalizedScore` e `assessmentState` (ver `backend/src/client-classifications/client-classifications.service.ts`). O problema é que três pontos da aplicação continuam lendo/escrevendo o campo **legado** `complexity` (Int? 0–3), que a própria ORDEM-01 marcou como *"LEGADO: valor 0-3 digitado na planilha. Não usar em cálculo novo."*

**Defeito A — leitura errada + piso artificial**
`frontend/src/components/Client360SlideOver.tsx:693-695`
```tsx
{[1, 2, 3].map((level) => {
  const isActive = level <= (frontSnap.complexity || 1);
```
Dois erros somados: a escala é `[1,2,3]` (deveria ser 0–5), e o `|| 1` faz um cliente **sem avaliação nenhuma** aparecer como nível 1. É exatamente o "sempre nível 1" relatado.

**Defeito B — entrada manual de um valor derivado**
`frontend/src/components/FrontClassificationForm.tsx:146`
```tsx
{renderSelect('Percepção de Complexidade', 'complexity', [
  {label: '1 - Baixa', value: '1'},
  {label: '2 - Média', value: '2'},
  {label: '3 - Alta', value: '3'}
])}
```
Escreve direto no campo que o Defeito A lê. É o "altera quando não é para alterar". Complexidade é resultado de um conjunto de parâmetros — não pode ter campo de digitação.

**Defeito C — o gráfico do ciclo tem o mesmo problema**
`backend/src/management-cycles/management-cycles.service.ts:469-472`
```ts
if (snap.complexity !== null && snap.complexity !== undefined) {
  const comp = `Nível ${snap.complexity}`;
```
O gráfico "Nível de Complexidade" da tela de ciclo monta os buckets a partir do mesmo campo legado. Ou seja: **o painel de performance do M0 está exibindo o número digitado, não o calculado.** Hoje essa tela e a curva do Diagnóstico mostram números diferentes para a mesma coisa.

### 3.3 Solução recomendada

**S3.1 — Remover "Percepção de Complexidade" do formulário.** É a correção do Defeito B. O campo `complexity` **permanece no schema** (regra inviolável nº 1 da ORDEM-01: só adições), mas deixa de ter escrita pela interface. Fica como dado histórico das importações antigas.

**S3.2 — Trocar a barra pela classe calculada.** Correção do Defeito A:
- escala de **6 posições (C0…C5)**, não 3;
- ler `complexityClass`, nunca `complexity`;
- **sem fallback** — quando `assessmentState` for `NOT_ASSESSED`/`PARTIAL`, exibir "Não avaliado" com link para completar, e não uma barra vazia que se confunde com C0.

A distinção importa: **C0 significa "não atua nesta frente"** (resultado válido), enquanto `NOT_ASSESSED` significa "faltam notas" (pendência de trabalho). Colapsar os dois é o que faz uma carteira não mapeada parecer mapeada.

**S3.3 — Trocar a fonte do gráfico do ciclo.** Correção do Defeito C: `distributionByComplexity` passa a agrupar por `complexityClass`, com C0 e pendentes exibidos à parte — mesma regra já aplicada na curva do Diagnóstico (`dashboard.service.ts`), que foi feita certo.

**S3.4 — Exibir CC e CO separados, não um número só.** Quando o template CC/CO entrar, este bloco deve mostrar o par (ex.: `CC 3 · CO 2`), porque é essa separação que diz ao consultor onde há ação possível. Ver §4.

**S3.5 — Varredura de regressão.** Buscar todo consumo remanescente de `complexity` (frontend e backend) e listar. A ORDEM-01 declarou o campo legado, mas não removeu os consumidores — foi assim que o bug sobreviveu.

---

## 4. Decisões de negócio ainda pendentes

A implementação do motor CC/CO depende de dez pontos levantados na análise do template. Dois foram resolvidos na revisão de 03/09. **Os demais continuam abertos e bloqueiam o Bloco C do plano.**

| # | Ponto | Status |
|---|---|---|
| 1 | Faixas de Total de Vínculos (1–10=1, 11–50=3, 51+=5) | ✅ resolvido — falta definir o caso `0 vínculos` |
| 5 | "Não se aplica" sai do numerador e do denominador | ✅ resolvido |
| 8 | Campo 44 (Pessoal → Recebimento documentos): notas preenchidas mas marcado "Cadastro / Controle" | ⚠️ **contraditório** — muda o denominador do CO Pessoal de 4 para 5 |
| 2 | Nota Volume virou lista manual — os drivers numéricos (`monthlyNotesCount`, `launchesCount`) continuam ou saem? | ⏳ aberto |
| 3 | C0 entra no denominador da média da carteira (confirmado na fórmula) — é mesmo desejado? | ⏳ aberto |
| 4 | Frente não contratada = C0 ou fora do denominador? | ⏳ aberto |
| 6 | Comparabilidade entre frentes (4/5/6/7 notas com média simples) | ⏳ aberto |
| 7 | Salto 1→3→5 nas listas de 3 opções | ⏳ aberto |
| 9 | Campo 33 (Último Mês de Conciliação) sem índice | ⏳ aberto |
| 10 | Cadastro por ciclo: `Client` vivo ou `ClientCycleSnapshot` é a entidade primária de edição? | ⏳ **aberto — bloqueia o Bloco A** |
| 11 | Recalibração dos canais quebra a série histórica do CO: recalcular o passado ou versionar a tabela? | ⏳ aberto |

Contradição adicional a desempatar: no exemplo da aba de lógica, o cliente C (Fiscal) é `0-0` — zera os dois índices — mas o cliente D (Contábil) é `0-3`, com CC zerado e CO valendo 3. Se `Inativa`/`Sem Movimento` é gatilho de C0, deveria zerar ambos. Ou há dois gatilhos distintos com efeitos distintos.

---

## 4.1 Decisões fechadas na reunião de 09/09/2026

A ata do cliente resolveu os pontos que travavam os Blocos A e C.

**Frente inativa sai do cálculo — não vira zero.** A premissa de "dois tipos de zero" estava errada. Cliente inativo numa frente não aparece naquela frente: fora do numerador e do denominador, em todos os níveis de agregação. O caso `0-3` do exemplo da planilha (Natureza zerada com Maturidade valendo 3) deixa de existir.

**Reflexo na listagem de clientes:** não exibir Ativo/Inativo. Exibir as siglas das frentes em que o cliente está ATIVO, e "INATIVO" apenas quando ele estiver inativo em todas.

**"NÃO SE APLICA" por característica** sai do numerador e do denominador da média daquela frente.

**Índice com uma casa decimal, classe derivada por faixa.** Decimal é o valor, classe é a faixa — convivem, não era escolher um.

| Classe | Faixa |
|---|---|
| C0 | 0 até 0 |
| C1 | 0,1 até 1,4 |
| C2 | 1,5 até 2,4 |
| C3 | 2,5 até 3,4 |
| C4 | 3,5 até 4,4 |
| C5 | 4,5 até 5,0 |

Como toda nota aplicável vale no mínimo 1 e frentes inativas ficam fora, a média nunca dá 0 nem cai entre 0,1 e 0,9. **C0 deixa de ser resultado de cálculo e passa a ser um estado** ("sem frente ativa"); C1 começa efetivamente em 1,0.

### Consequência: o exemplo da planilha ficou desatualizado

Recalculando a aba "Lógica da Complexidade" com as regras acima:

| | Na planilha | Com as novas regras |
|---|---|---|
| Fiscal | CC 1,8 · CO 2,3 (n=6) | **CC 2,2 (C2) · CO 2,8 (C3)** (n=5) |
| Contábil | CC 2,5 · CO 2,5 (n=6) | **CC 3,0 (C3) · CO 2,4 (C2)** (n=5) |
| Pessoal | CC 2,5 · CO 3,0 (n=6) | CC 2,5 (C3) · CO 3,0 (C3) (n=6) |
| Carteira geral | CC 2,3 · CO 2,6 (n=18) | **CC 2,6 · CO 2,8** (n=16) |

Atualizar a aba antes que o desenvolvimento a consuma como fonte, sob pena de codificar o comportamento antigo.

### Continua em aberto

- Campo 44 (Pessoal → Recebimento documentos): notas de CO preenchidas, marcadores dizendo `Cadastro / Controle`. Muda o divisor do CO Pessoal de 4 para 5.
- Atendimento pontuando nos dois índices: precisa constar como decisão consciente.
- Faixas de Volume no Fiscal e no Contábil.
- Tempos de referência e fatores (ORDEM-03) — o cliente registrou que não trataria disso nesta fase.

---

## 5. Plano de execução proposto

Blocos na ordem de dependência. Cada bloco termina com `npm run build` no backend e reporte antes de seguir.

### BLOCO B — Correção do bug (independente, vai primeiro)
- B1. Remover "Percepção de Complexidade" do `FrontClassificationForm`
- B2. Barra C0–C5 lendo `complexityClass`, com estado "Não avaliado" explícito
- B3. `distributionByComplexity` por `complexityClass`, com C0 e pendentes à parte
- B4. Varredura e relatório do consumo residual de `complexity`

### BLOCO A — Fundação de domínio (bloqueado pela decisão nº 10)
- A1. Módulo único de domínios (listas do template) no backend, servido por endpoint
- A2. Campos novos no schema (**só adições**): perfil do cliente, notas CC/CO por frente, responsável secundário por frente
- A3. Decidir e implementar a granularidade por ciclo

### BLOCO C — Motor CC/CO (bloqueado pelas decisões 2,3,4,6,7,8,11)
- C1. Funções puras `calculateCC` / `calculateCO` (sem I/O, testáveis — padrão da ORDEM-01)
- C2. Agregação nos 4 recortes: cliente/frente, cliente/geral, carteira/área, carteira/geral
- C3. Suíte de testes replicando o exemplo numérico da aba "Lógica da Complexidade"

### BLOCO D — Formulário completo
- D1. Unificar `ClientModal` + `ClientCycleModal`
- D2. Wizard de 4 passos com switches de frente controlando os passos
- D3. Campos de nota por frente
- D4. CC/CO parciais em tempo real

### BLOCO E — Encaixe M0
- E1. Teste de contrato do M0
- E2. Indicador de completude da carteira
- E3. Versionamento do template nas avaliações

### BLOCO F — Migração
- F1. Mapear dados existentes para os novos domínios fechados
- F2. Relatório do que não mapeou automaticamente (texto livre fora das listas)
- F3. Comando de push preparado **e não executado**, com a lista de tenants afetados

---

## 6. Regras herdadas da ORDEM-01 que continuam valendo

1. **Só adicionar campos no schema.** Nunca remover, renomear ou mudar tipo. `db push --accept-data-loss` apaga sem perguntar.
2. `ClientFrontClassification.complexity` **permanece** — vira campo morto, não apagado.
3. **Nunca rodar** `push-all-schemas.ts` sem aprovação humana explícita.
4. Todo acesso a dado de tenant passa por `getTenantPrisma`.
5. Funções de cálculo puras e testáveis; o service orquestra, a função calcula.
6. Se o frontend consumir um campo alterado, atualizar na mesma tarefa.

---

## 7. Template de importação em coluna única (pedido de 11/09/2026)

Pedido do cliente: em vez de a planilha de carteira ser separada em abas, ser
uma tabela corrida, em uma aba só, e a importação funcionar do mesmo jeito.

### 7.1 O que o layout em abas custava

O template MVP REV03 normalizava os dados em quatro abas — `01_Clientes` mais
uma por frente — casadas por CNPJ/CPF. O modelo é correto do ponto de vista de
dados e ruim do ponto de vista de quem preenche:

- o documento precisa ser repetido em até quatro lugares, sempre igual;
- um CNPJ digitado com um dígito diferente numa aba faz aquela frente inteira
  desaparecer da importação — o defeito é silencioso, porque a linha órfã não
  pertence a nenhum cliente (foi o que motivou o aviso de linha órfã em
  `imports.service.ts`);
- para conferir um cliente é preciso procurá-lo em quatro lugares.

### 7.2 Layout novo

Uma aba, um cliente por linha. As colunas do bloco MESTRE vêm sem prefixo; as
de frente vêm prefixadas com a frente:

```
CNPJ/CPF | Razão social/Nome | ... | Fiscal | Nota Volume | ... | Pessoal | Qtd. Funcionários
```

Regras do formato:

1. **Prefixo define a frente.** Aceita `|`, `:`, `>`, `/` e hífen como
   separador — só é tratado como prefixo quando o texto antes do separador é
   nome de frente, então `Classificação A-D` e `Razão social/Nome` continuam
   sendo campos do cliente. Os apelidos `DP` e `RH` valem como Pessoal.
2. **`Fiscal?`, `Contábil?` e `Pessoal?` declaram o escopo.** Frente marcada
   com "Não" não é avaliada — o que não é o mesmo que nota zero: ela sai do
   numerador **e** do denominador, conforme a decisão de 09/09/2026. Frente
   marcada com "Sim" e sem respostas entra como pendência de mapeamento, que é
   o caso do cliente recém-contratado.
3. **Sem a coluna de escopo**, a frente entra quando tem alguma resposta
   preenchida. Coluna presente e vazia não inventa frente contratada.
4. **Rótulo exclusivo de uma frente é aceito sem prefixo** (`Qtd.
   Funcionários` só existe no Pessoal). O que se repete entre frentes
   (`Nota Atendimento`, nas três) exige prefixo — adivinhar aqui seria pontuar
   a frente errada.
5. **O template antigo continua aceito.** Quando o arquivo tem as abas, elas
   têm precedência; a divisão por prefixo é o caminho alternativo, não um
   substituto. Há escritório com a carteira já preenchida no formato antigo.

### 7.3 O template é gerado, não mantido à mão

`docs/tools/gerar-template-carteira.py` produz
`frontend/public/Template_Carteira_Sevilha.xlsx` a partir da **mesma** planilha
que gera o catálogo (`docs/Sistema - Base de Cadastro de Clientes.xlsx`).

O motivo é o mesmo que justificou gerar o catálogo: se um rótulo de coluna ou
uma opção de lista divergir do catálogo, a importação aceita o arquivo e deixa
a resposta em branco. O cliente entra na carteira sem complexidade e o erro só
aparece semanas depois, no planejamento. Gerando os dois da mesma fonte, não
há como divergir.

O arquivo gerado traz:

- validação em lista em todas as 32 colunas de domínio fechado, com as listas
  em colunas ocultas da própria aba — é o que permite ter opção com vírgula
  (os segmentos) e lista acima de 255 caracteres sem precisar de uma segunda
  aba;
- um comentário em cada cabeçalho com o número do campo, o que ele pontua
  (CC, CO, ambos ou nada), o pilar e a regra da planilha;
- o CNPJ/CPF formatado como texto, senão o Excel come o zero à esquerda do CPF
  e transforma o CNPJ em notação científica;
- `Status da frente` por frente, que não existe no catálogo (ele descreve o
  cadastro, não o ciclo) mas é o que informa "Sem movimento" ao motor.

Campos do tipo Resultado ficam fora do template: `Total de Vínculos` é
calculado das quantidades e preenchê-lo à mão só criaria divergência.

### 7.4 A armadilha que o template novo abriu

O motor antigo (`ClientFrontClassification.score*`, painel de Diagnóstico por
critério) lê notas de 1 a 3. O template antigo trazia números e o importador só
copiava a célula. O template novo traz o rótulo da opção — "Alto", "Média" —, e
o `parseNote` tratava texto como **valor inválido**: além de registrar erro, ele
marcava a linha e a frente inteira deixava de ser gravada.

Ou seja: o template correto derrubaria a importação.

Duas mudanças resolveram:

- `legacyNoteFromAnswers` faz o caminho inverso de `optionFromLegacyNote` — da
  resposta do catálogo de volta para 1–3, pela posição da opção na escala.
  Continua respeitando a escala invertida da Organização ("Alta" pontua 1);
  há teste de ida e volta nas duas direções, porque se elas discordarem uma
  reimportação mexe na carteira sem ninguém ter mudado a planilha.
- texto que não virou resposta não é mais erro de nota: a tradução já avisou o
  motivo, e rejeitar de novo derrubaria a frente por causa de uma célula.

### 7.5 Teste que fecha o circuito

`backend/src/imports/flat-template.template.spec.ts` tem uma linha preenchida
com as colunas e os valores **reais** do arquivo gerado, e verifica que ela
atravessa o caminho inteiro: divisão por prefixo, tradução do MESTRE e das três
frentes sem nenhum aviso, todos os campos que pontuam respondidos, e os dois
índices saindo calculados com uma casa decimal.

Renomear uma única coluna do gerador faz esse teste falhar — verificado.
