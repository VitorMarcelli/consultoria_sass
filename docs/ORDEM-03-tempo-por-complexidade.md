# ORDEM DE SERVIÇO 03 — Tempo por Complexidade

**Repositório:** `consultoria_sass`
**Data:** 07/09/2026
**Status:** especificação — nenhuma linha de código alterada
**Depende de:** ORDEM-02 (motor CC/CO) · **Origem:** decisão do cliente pela opção (b)

---

## 0. Por que isto existe

A complexidade não é métrica de relatório. É o **coeficiente que diferencia tempo por entrega**. A cadeia é:

```
Cadastro (CC + CO)  →  Cadastro de Entregas & Tempos  →  Agenda e Acompanhamento Diário
```

Uma folha de pagamento de um cliente C1 não pode ocupar o mesmo espaço de agenda que a de um cliente C5. Sem essa diferenciação, a carteira é distribuída por *quantidade* de clientes em vez de por *carga real*, e o operador com 30 clientes simples aparece tão carregado quanto o que tem 12 complexos.

**Hoje não existe diferenciação nenhuma.** Em `deliveries.service.ts`, `resolveActivityFields()` faz:

```ts
estimatedTimeMinutes: requestedEstimatedTimeMinutes ?? defaultEstimatedTimeMinutes
```

O tempo do catálogo é copiado para a entrega sem olhar para o cliente. Esta ordem fecha esse elo.

---

## 1. O modelo escolhido

Opção **(b)** — tempo-base por atividade, multiplicado por fator de classe. Escolhida em vez da tabela cheia (atividade × classe) porque exige poucos números para manter e permite recalibrar a operação inteira de uma vez.

```
tempoPrevisto = tempoBase(atividade) × fatorCC(classeCC) × fatorCO(classeCO)
```

Onde `classeCC` e `classeCO` são as classes do cliente **na frente daquela entrega** — não as classes gerais do cliente. Uma entrega fiscal usa o CC/CO fiscais.

### 1.1 Por que os dois fatores, e não só um

Decorre direto da distinção do negócio:

- **CC (Natureza do Cliente)** é o esforço **irredutível**. Um balanço de Lucro Real não vira balanço de Simples porque a operação melhorou. Se o multiplicador fosse só CO, um cliente Lucro Real bem operado seria planejado igual a um MEI bem operado.
- **CO (Maturidade da Operação)** é o **desperdício evitável**. Se o multiplicador fosse só CC, melhorar o fluxo não reduziria o tempo planejado — e o produto da consultoria deixaria de aparecer no número.

### 1.2 A decomposição que vira argumento comercial

É o que esta ordem entrega de mais valioso:

```
tempoIrredutivel = tempoBase × fatorCC
desperdicio      = tempoPrevisto − tempoIrredutivel
```

`desperdicio` é a quantidade de horas por mês que o projeto de consultoria devolve ao escritório quando o CO cai. É um número calculado, não uma promessa.

### 1.3 A assimetria proposital entre as duas escalas

| Classe | `fatorCC` | `fatorCO` |
|---|---|---|
| C1 | 0,60 | **1,00** |
| C2 | 0,80 | 1,15 |
| C3 | 1,00 | 1,30 |
| C4 | 1,30 | 1,50 |
| C5 | 1,70 | 1,80 |

`fatorCC` gira em torno de 1,0 — um cliente simples realmente consome menos que o de referência, um complexo consome mais.

**`fatorCO` nunca desce abaixo de 1,0.** Operação madura é a linha de base, não um bônus. Se o CO pudesse reduzir o tempo abaixo do irredutível, o sistema estaria afirmando que o escritório trabalha mais rápido do que é fisicamente necessário — e o número de "horas devolvidas" sairia inflado.

Os valores acima são **ponto de partida, não verdade**. Devem ser parâmetro por escritório: carteiras e ferramentas diferentes calibram diferente.

---

## 2. O risco de calibração — ler antes de preencher qualquer tempo

`ActivityCatalog.defaultEstimatedTimeMinutes` passa a significar:

> **o tempo daquela atividade para um cliente de referência (CC = C3) com operação madura (CO = C1).**

**Não** significa "o tempo que leva hoje".

Se o escritório preencher o tempo-base com o tempo atual — que já embute o desperdício da operação imatura — os multiplicadores incidem sobre um número já inflado, e o sistema conta o desperdício duas vezes. O plano de agenda fica folgado e o ganho projetado do projeto vira ficção.

Consequência prática: a tela de cadastro do catálogo precisa dizer isso no próprio campo, não em manual à parte.

---

## 3. Casos de borda

| Situação | Comportamento |
|---|---|
| Cliente em **C0** na frente | Não atua → não há entrega → nada a calcular |
| Cliente **sem avaliação** (`NOT_ASSESSED`, `PARTIAL`, `IMPORTED`, `AI_SUGGESTED`) | Usa fator 1,0 nos dois **e marca a entrega como tempo não calibrado**. Nunca fingir que a estimativa é qualificada |
| Tempo **sobrescrito à mão** na entrega | Continua permitido (já existe hoje), mas registra que foi override — senão o real vira ruído na calibração |
| Atividade **sem tempo-base** | Entrega nasce sem tempo previsto, como hoje. Não inventar |

### 3.1 Recálculo — decisão pendente

Se o CO do cliente cair no meio do ciclo, o que acontece com as entregas já criadas?

**Recomendação:** entregas já criadas mantêm o tempo com que foram planejadas; o novo fator vale a partir do próximo ciclo. Recalcular retroativamente faz a agenda mudar debaixo do pé de quem já se organizou, e destrói a comparação entre planejado e real do ciclo corrente.

🛑 Confirmar com o cliente antes de implementar.

---

## 4. Onde isto encosta no código existente

O modelo de dados **já suporta** — não há campo novo no caminho principal:

| Campo existente | Papel novo |
|---|---|
| `ActivityCatalog.defaultEstimatedTimeMinutes` | tempo-base da atividade (redefinido conforme §2) |
| `Delivery.estimatedTimeMinutes` | passa a ser o **resultado do cálculo**, não cópia do catálogo |
| `Delivery.realTimeMinutes` | permanece — é o que permite auditar a calibração |
| `ClientFrontClassification` / `ClientCycleSnapshot` | fornecem `complexityClass` de CC e CO por frente |

Falta acrescentar apenas: a **tabela de fatores por escritório** (candidato natural: `SystemOption`, que já existe) e, na entrega, o registro de como o tempo foi obtido (calculado, não calibrado ou override).

---

## 5. Plano de execução

### BLOCO G — Motor de tempo
- **G1.** Função pura `calculateDeliveryTime({ tempoBase, classeCC, classeCO, fatores })` devolvendo `{ tempoPrevisto, tempoIrredutivel, desperdicio, origem }`. Sem I/O, testável — padrão da ORDEM-01.
- **G2.** Tabela de fatores por escritório, com os valores de §1.3 como padrão.
- **G3.** `resolveActivityFields()` passa a usar o motor em vez de copiar o tempo do catálogo.
- **G4.** Testes cobrindo os casos de borda de §3.

### BLOCO H — Superfície
- **H1.** Campo do catálogo explica o significado do tempo-base (§2).
- **H2.** Entrega exibe a composição: base, fatores aplicados e desperdício.
- **H3.** Painel do escritório: horas irredutíveis × horas de desperdício, e a projeção de quanto o projeto devolve.

⚠️ **Bloqueado por:** ORDEM-02 Bloco C (o motor CC/CO precisa existir e produzir classe por frente antes de qualquer fator ser aplicado).

---

## 6. O que ainda falta do cliente

1. **Os tempos-base reais**, no significado de §2, para as atividades mais frequentes de cada frente.
2. **Confirmação dos fatores** de §1.3, ou os números que o escritório considera corretos.
3. **A regra de recálculo** de §3.1.
