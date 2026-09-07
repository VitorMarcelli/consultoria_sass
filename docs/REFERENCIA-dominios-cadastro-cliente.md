# REFERÊNCIA — Domínios e Notas do Cadastro de Clientes

**Gerado automaticamente** de `Sistema - Base de Cadastro de Clientes.xlsx` em 07/09/2026.
Não editar à mão: rode `python docs/tools/gerar-referencia-dominios.py`.

Fonte única para implementar o catálogo de domínios (solução **S1.2** da ORDEM-02).

## Legenda

- **CC** = Complexidade do Cliente · **CO** = Complexidade Operacional. Escala 1–5.
- Notas na ordem **Fiscal / Contábil / Pessoal**; `—` = não pontua naquela frente.
- `N/A` na coluna CO = opção sai do numerador **e** do denominador da média.
- **Atenção:** em *Nota Organização* a escala é invertida — Alta = 1, Baixa = 5.

---

## [1] MESTRE — Data de Início (Operação)

- **Tipo:** Mascara (Data)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe a data em que o escritório iniciou efetivamente o atendimento operacional do cliente, e não apenas a data de assinatura do contrato.

## [2] MESTRE — Ciclo (AAAA-MM)

- **Tipo:** Mascara (Data)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe o mês de referência ao qual os dados do cadastro se aplicam, no formato AAAA-MM.

## [3] MESTRE — CNPJ/CPF

- **Tipo:** Mascara (CNPJ / CPF)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe o documento da unidade efetivamente cadastrada: CNPJ para pessoa jurídica e CPF para pessoa física, produtor rural PF ou empregador doméstico.

## [4] MESTRE — Perfil do Cliente

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Cliente · CC=Sim · CO=Não
- **Aplica em:** Fiscal=Sim · Contábil=Sim · Pessoal=Sim · Geral=Sim — via áreas
- **Pilar:** Perfil jurídico/operacional

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Empresa – PJ | 3 / 3 / 3 | — / — / — | Escolha quando o cadastro representar uma pessoa jurídica constituída e identificada por CNPJ. |
| Produtor Rural – PF | 4 / 3 / 3 | — / — / — | Escolha quando a atividade rural for exercida por pessoa física identificada por CPF, mesmo que possua inscrição estadual ou propriedade rural. |
| Pessoa Física | 1 / 1 / 1 | — / — / — | Escolha quando o atendimento for prestado diretamente a uma pessoa física que não se enquadre como produtor rural nem empregador doméstico. |
| Empregador Doméstico | 1 / 1 / 1 | — / — / — | Escolha quando o cadastro existir para atender obrigações relacionadas exclusivamente a vínculos de trabalho doméstico. |

## [5] MESTRE — Razão social/Nome

- **Tipo:** Texto
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe a razão social constante no cadastro oficial; para pessoa física, informe o nome completo.

## [6] MESTRE — Nome fantasia

- **Tipo:** Texto
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe o nome pelo qual o cliente é identificado na operação; se não houver nome fantasia, deixe o campo em branco.

## [7] MESTRE — Status contrato

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Elegibilidade · CC=Não · CO=Não
- **Aplica em:** Fiscal=Gatilho · Contábil=Gatilho · Pessoal=Gatilho · Geral=Gatilho
- **Pilar:** Status / elegibilidade

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Ativo | — / — / — | — / — / — | Escolha quando o contrato estiver vigente e o cliente permanecer em atendimento no ciclo de referência. |
| Sem Movimento | — / — / — | — / — / — | Escolha quando o contrato permanecer vigente, mas não houver movimentação operacional do cliente no ciclo de referência. |
| Inativa | — / — / — | — / — / — | Escolha quando o contrato ou atendimento estiver encerrado e o cliente não fizer mais parte da operação vigente. |

## [8] MESTRE — Segmento

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Agronegócio | — / — / — | — / — / — | Escolha quando a atividade principal estiver ligada à produção rural, agricultura, pecuária ou exploração agropecuária. |
| Alimentação, Hotelaria e Turismo | — / — / — | — / — / — | Escolha quando a atividade principal for restaurante, bar, hotel, hospedagem, eventos ou serviço turístico. |
| Comércio e Distribuição | — / — / — | — / — / — | Escolha quando a atividade principal for compra, venda, revenda, atacado, varejo, e-commerce ou distribuição de produtos. |
| Construção e Mercado Imobiliário | — / — / — | — / — / — | Escolha quando a atividade principal envolver construção, incorporação, engenharia, imobiliária, locação ou administração imobiliária. |
| Educação | — / — / — | — / — / — | Escolha quando a atividade principal for ensino, escola, curso, treinamento ou outra prestação educacional. |
| Entidades, Condomínios e Terceiro Setor | — / — / — | — / — / — | Escolha quando o cadastro representar associação, fundação, igreja, sindicato, condomínio ou organização sem finalidade empresarial típica. |
| Financeiro, Seguros e Investimentos | — / — / — | — / — / — | Escolha quando a atividade principal envolver serviços financeiros, crédito, seguros, investimentos, factoring ou intermediação financeira. |
| Holdings e Patrimonial | — / — / — | — / — / — | Escolha quando a finalidade principal for participação societária, administração de bens ou gestão patrimonial própria. |
| Indústria | — / — / — | — / — / — | Escolha quando a atividade principal envolver fabricação, transformação, montagem ou beneficiamento de produtos. |
| Pessoa Física e Empregador Doméstico | — / — / — | — / — / — | Escolha quando o atendimento não estiver associado a uma atividade empresarial e o cadastro se referir a pessoa física ou empregador doméstico. |
| Saúde e Bem-Estar | — / — / — | — / — / — | Escolha quando a atividade principal for médica, odontológica, clínica, terapêutica, estética, esportiva ou de bem-estar. |
| Serviços Empresariais e Profissionais | — / — / — | — / — / — | Escolha quando a atividade principal for consultoria ou prestação de serviços técnicos, administrativos, jurídicos, comerciais ou profissionais. |
| Tecnologia e Comunicação | — / — / — | — / — / — | Escolha quando a atividade principal envolver software, tecnologia da informação, telecomunicações, mídia ou comunicação. |
| Transporte e Logística | — / — / — | — / — / — | Escolha quando a atividade principal for transporte, entrega, armazenagem, movimentação ou logística de cargas ou pessoas. |
| Outros | — / — / — | — / — / — | Escolha somente quando nenhuma categoria disponível representar adequadamente a atividade principal; descreva a atividade em Observações - Gerais. |

## [9] MESTRE — Regime tributário

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Cliente · CC=Sim · CO=Não
- **Aplica em:** Fiscal=Sim · Contábil=Sim · Pessoal=Não · Geral=Sim — via áreas
- **Pilar:** Regime tributário

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Imune ou Isenta | 4 / 4 / — | — / — / — | Escolha quando o cliente possuir enquadramento formal de imunidade ou isenção tributária no ciclo de referência. |
| Lucro Presumido | 3 / 3 / — | — / — / — | Escolha quando o regime tributário vigente do cliente for Lucro Presumido. |
| Lucro Real | 5 / 5 / — | — / — / — | Escolha quando o regime tributário vigente do cliente for Lucro Real, independentemente de apuração anual ou trimestral. |
| Regime Especial | 5 / 5 / — | — / — / — | Escolha quando o cliente estiver submetido a tratamento tributário especial formal que não seja adequadamente representado pelos demais regimes da lista. |
| Simples | 1 / 1 / — | — / — / — | Escolha quando o cliente estiver formalmente optante pelo Simples Nacional no ciclo de referência. |

## [10] MESTRE — Honorário faturado

- **Tipo:** Mascara (Valor)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe o honorário efetivamente faturado para esta unidade no ciclo de referência, aplicando o mesmo critério de inclusão de adicionais utilizado pelo escritório.

## [11] MESTRE — Faixa faturamento anual

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Cliente · CC=Sim · CO=Não
- **Aplica em:** Fiscal=Sim · Contábil=Sim · Pessoal=Não · Geral=Sim — via áreas
- **Pilar:** Porte

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Até R$ 360 mil | 1 / 1 / — | — / — / — | Escolha quando o faturamento bruto anual dos últimos 12 meses ou do último exercício fechado for de até R$ 360 mil. |
| R$ 360 mil–1,2 mi | 2 / 2 / — | — / — / — | Escolha quando o faturamento bruto anual for superior a R$ 360 mil e de até R$ 1,2 milhão. |
| R$ 1,2–4,8 mi | 3 / 3 / — | — / — / — | Escolha quando o faturamento bruto anual for superior a R$ 1,2 milhão e de até R$ 4,8 milhões. |
| R$ 4,8–20 mi | 4 / 4 / — | — / — / — | Escolha quando o faturamento bruto anual for superior a R$ 4,8 milhões e de até R$ 20 milhões. |
| R$ 20–78 mi | 5 / 5 / — | — / — / — | Escolha quando o faturamento bruto anual for superior a R$ 20 milhões e de até R$ 78 milhões. |
| Acima de R$ 78 mi | 5 / 5 / — | — / — / — | Escolha quando o faturamento bruto anual for superior a R$ 78 milhões. |

## [12] MESTRE — Classificação A-D

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| A | — / — / — | — / — / — | Escolha A quando o cliente estiver enquadrado nessa classe segundo a regra interna vigente do escritório; não altere a classe apenas por percepção do responsável. |
| B | — / — / — | — / — / — | Escolha B quando o cliente estiver enquadrado nessa classe segundo a regra interna vigente do escritório; não altere a classe apenas por percepção do responsável. |
| C | — / — / — | — / — / — | Escolha C quando o cliente estiver enquadrado nessa classe segundo a regra interna vigente do escritório; não altere a classe apenas por percepção do responsável. |
| D | — / — / — | — / — / — | Escolha D quando o cliente estiver enquadrado nessa classe segundo a regra interna vigente do escritório; não altere a classe apenas por percepção do responsável. |

## [13] MESTRE — Fiscal?

- **Tipo:** Switch
- **Classificação:** Elegibilidade · CC=Não · CO=Não
- **Aplica em:** Fiscal=Gatilho · Contábil=Não · Pessoal=Não · Geral=Gatilho
- **Pilar:** Frente contratada
- **Regra:** Marque Sim quando a frente Fiscal fizer parte do escopo contratado no ciclo, mesmo que esteja sem movimento; marque Não quando estiver fora do contrato.

## [14] MESTRE — Contábil?

- **Tipo:** Switch
- **Classificação:** Elegibilidade · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Gatilho · Pessoal=Não · Geral=Gatilho
- **Pilar:** Frente contratada
- **Regra:** Marque Sim quando a frente Contábil fizer parte do escopo contratado no ciclo, mesmo que esteja sem movimento; marque Não quando estiver fora do contrato.

## [15] MESTRE — Pessoal?

- **Tipo:** Switch
- **Classificação:** Elegibilidade · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Gatilho · Geral=Gatilho
- **Pilar:** Frente contratada
- **Regra:** Marque Sim quando a frente Pessoal fizer parte do escopo contratado no ciclo, mesmo que esteja sem movimento; marque Não quando estiver fora do contrato.

## [16] MESTRE — Observações - Gerais

- **Tipo:** Texto
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Registre somente particularidades gerais relevantes que não possam ser representadas pelos demais campos; evite repetir informações já cadastradas.

## [17] FISCAL — Responsável principal - Fiscal

- **Tipo:** Relação (Base de Equipe)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe a pessoa que responde prioritariamente pela carteira deste cliente no ciclo; quando houver atuação compartilhada, use o titular formalmente definido.

## [18] FISCAL — Responsável secundário - Fiscal

- **Tipo:** Relação (Base de Equipe)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe apenas quando houver uma segunda pessoa formalmente designada para apoio, cobertura ou corresponsabilidade; caso contrário, deixe em branco.

## [19] FISCAL — Forma recebimento documentos

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Sim · Contábil=Não · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Recebimento / organização do fluxo

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Plataforma integrada | — / — / — | 1 / — / — | Escolha quando a maior parte dos documentos for recebida por plataforma conectada ao fluxo do escritório, sem download ou redigitação recorrente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Portal | — / — / — | 1 / — / — | Escolha quando o cliente disponibilizar a maior parte dos documentos em portal estruturado, acessado manualmente pelo escritório. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | 2 / — / — | Escolha quando o e-mail for o canal habitual de recebimento da maior parte dos documentos. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | 3 / — / — | Escolha quando a maior parte dos documentos chegar por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | 5 / — / — | Escolha quando a maior parte dos documentos for entregue em papel, presencialmente ou depender de digitalização e tratamento manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Acesso ao sistema do cliente | — / — / — | 3 / — / — | Escolha quando o escritório obtiver a maior parte das informações acessando diretamente o sistema do cliente, sem recebimento por outro canal. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não se aplica | — / — / — | — / — / — | Escolha somente quando essa etapa de recebimento não existir para o serviço prestado; não use para informação desconhecida ou ainda não recebida. |

## [20] FISCAL — Forma envio documentos

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Sim · Contábil=Não · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Envio / padronização do fluxo

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Plataforma integrada | — / — / — | 1 / — / — | Escolha quando a maior parte dos documentos for disponibilizada ao cliente por plataforma conectada ao fluxo do escritório, sem envio manual recorrente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Portal | — / — / — | 1 / — / — | Escolha quando o escritório publicar manualmente a maior parte dos documentos em portal estruturado para acesso do cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | 3 / — / — | Escolha quando o e-mail for o canal habitual de envio da maior parte dos documentos ao cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | 4 / — / — | Escolha quando a maior parte dos documentos for enviada por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | 5 / — / — | Escolha quando a maior parte dos documentos for entregue em papel, presencialmente ou por processo físico/manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não se aplica | — / — / — | — / — / — | Escolha somente quando essa etapa de envio não existir para o serviço prestado; não use para informação desconhecida ou ainda não enviada. |

## [21] FISCAL — Forma integração

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Sim · Contábil=Não · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Integração / automação

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Automática/API | — / — / — | 1 / — / — | Escolha quando os dados forem transferidos automaticamente por API ou conector, sem exportação, importação ou redigitação pelo operador. |
| Importação de arquivo | — / — / — | 2 / — / — | Escolha quando o operador exportar um arquivo estruturado da origem e importá-lo no sistema do escritório. |
| Acesso direto ao sistema | — / — / — | 2 / — / — | Escolha quando o trabalho for executado diretamente no sistema do cliente, sem transferência regular dos dados para outro sistema. |
| Híbrida | — / — / — | 3 / — / — | Escolha quando partes relevantes e recorrentes do processo utilizarem integração ou importação e outras partes permanecerem manuais. |
| Sem integração | — / — / — | 5 / — / — | Escolha quando os dados forem digitados, copiados ou transferidos manualmente, sem integração ou importação estruturada. |

## [22] FISCAL — Nota Volume

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Cliente · CC=Sim · CO=Não
- **Aplica em:** Fiscal=Sim · Contábil=Não · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Volume

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixo | 1 / — / — | — / — / — | Escolha quando o volume mensal estiver na faixa inferior definida pela área para clientes comparáveis, considerando os quantitativos efetivamente processados. |
| Médio | 3 / — / — | — / — / — | Escolha quando o volume mensal estiver na faixa intermediária definida pela área para clientes comparáveis. |
| Alto | 5 / — / — | — / — / — | Escolha quando o volume mensal estiver na faixa superior definida pela área para clientes comparáveis, de forma recorrente. |

## [23] FISCAL — Nota Atendimento

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Ambos · CC=Sim · CO=Sim
- **Aplica em:** Fiscal=Sim · Contábil=Não · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Atendimento

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixo | 1 / — / — | 1 / — / — | Escolha quando os contatos forem pouco frequentes, majoritariamente planejados e resolvidos sem cobranças ou alinhamentos recorrentes. |
| Médio | 3 / — / — | 3 / — / — | Escolha quando houver contatos regulares e algumas solicitações ou alinhamentos fora da rotina, mas sem predominância de urgências. |
| Alto | 5 / — / — | 5 / — / — | Escolha quando houver contatos frequentes, urgências, cobranças, múltiplos interlocutores ou necessidade recorrente de acompanhamento. |

## [24] FISCAL — Nota Organização

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Sim · Contábil=Não · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Organização

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixa | — / — / — | 5 / — / — | Escolha quando documentos e informações chegarem frequentemente incompletos, dispersos, fora do padrão ou dependerem de cobranças e reorganização recorrentes. |
| Média | — / — / — | 3 / — / — | Escolha quando documentos e informações chegarem geralmente organizados, mas ainda apresentarem falhas ou complementações ocasionais. |
| Alta | — / — / — | 1 / — / — | Escolha quando documentos e informações chegarem completos, padronizados, centralizados e dentro do fluxo combinado de forma consistente. |

## [25] FISCAL — Observações - Fiscal

- **Tipo:** Texto
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Registre somente exceções ou particularidades relevantes da área FISCAL que não possam ser representadas pelos demais campos; evite repetir o cadastro geral.

## [26] CONTÁBIL — Responsável principal - Contábil

- **Tipo:** Relação (Base de Equipe)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe a pessoa que responde prioritariamente pela carteira deste cliente no ciclo; quando houver atuação compartilhada, use o titular formalmente definido.

## [27] CONTÁBIL — Responsável secundário - Contábil

- **Tipo:** Relação (Base de Equipe)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe apenas quando houver uma segunda pessoa formalmente designada para apoio, cobertura ou corresponsabilidade; caso contrário, deixe em branco.

## [28] CONTÁBIL — Forma recebimento documentos

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Recebimento / organização do fluxo

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Plataforma integrada | — / — / — | — / 1 / — | Escolha quando a maior parte dos documentos for recebida por plataforma conectada ao fluxo do escritório, sem download ou redigitação recorrente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Portal | — / — / — | — / 1 / — | Escolha quando o cliente disponibilizar a maior parte dos documentos em portal estruturado, acessado manualmente pelo escritório. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | — / 2 / — | Escolha quando o e-mail for o canal habitual de recebimento da maior parte dos documentos. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | — / 3 / — | Escolha quando a maior parte dos documentos chegar por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | — / 5 / — | Escolha quando a maior parte dos documentos for entregue em papel, presencialmente ou depender de digitalização e tratamento manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Acesso ao sistema do cliente | — / — / — | — / 3 / — | Escolha quando o escritório obtiver a maior parte das informações acessando diretamente o sistema do cliente, sem recebimento por outro canal. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não se aplica | — / — / — | — / — / — | Escolha somente quando essa etapa de recebimento não existir para o serviço prestado; não use para informação desconhecida ou ainda não recebida. |

## [29] CONTÁBIL — Forma envio documentos

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Envio / padronização do fluxo

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Plataforma integrada | — / — / — | — / 1 / — | Escolha quando a maior parte dos documentos for disponibilizada ao cliente por plataforma conectada ao fluxo do escritório, sem envio manual recorrente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Portal | — / — / — | — / 1 / — | Escolha quando o escritório publicar manualmente a maior parte dos documentos em portal estruturado para acesso do cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | — / 2 / — | Escolha quando o e-mail for o canal habitual de envio da maior parte dos documentos ao cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | — / 4 / — | Escolha quando a maior parte dos documentos for enviada por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | — / 5 / — | Escolha quando a maior parte dos documentos for entregue em papel, presencialmente ou por processo físico/manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não se aplica | — / — / — | — / — / — | Escolha somente quando essa etapa de envio não existir para o serviço prestado; não use para informação desconhecida ou ainda não enviada. |

## [30] CONTÁBIL — Forma integração

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Integração / automação

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Automática/API | — / — / — | — / 1 / — | Escolha quando os dados forem transferidos automaticamente por API ou conector, sem exportação, importação ou redigitação pelo operador. |
| Importação de arquivo | — / — / — | — / 2 / — | Escolha quando o operador exportar um arquivo estruturado da origem e importá-lo no sistema do escritório. |
| Acesso direto ao sistema | — / — / — | — / 2 / — | Escolha quando o trabalho for executado diretamente no sistema do cliente, sem transferência regular dos dados para outro sistema. |
| Híbrida | — / — / — | — / 3 / — | Escolha quando partes relevantes e recorrentes do processo utilizarem integração ou importação e outras partes permanecerem manuais. |
| Sem integração | — / — / — | — / 5 / — | Escolha quando os dados forem digitados, copiados ou transferidos manualmente, sem integração ou importação estruturada. |

## [31] CONTÁBIL — Forma de lançamento

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Automação do lançamento

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Manual | — / — / — | — / 5 / — | Escolha quando a maior parte dos lançamentos for digitada ou registrada manualmente no sistema contábil. |
| Importação de arquivo | — / — / — | — / 3 / — | Escolha quando a maior parte dos lançamentos for incluída por importação de arquivo estruturado, acionada pelo operador. |
| Integração automática | — / — / — | — / 1 / — | Escolha quando a maior parte dos lançamentos entrar automaticamente por integração, sem digitação ou importação manual recorrente. |
| Mista | — / — / — | — / 3 / — | Escolha quando duas ou mais formas de lançamento forem relevantes e recorrentes, sem predominância clara de uma única forma. |

## [32] CONTÁBIL — Periodicidade de Fechamento

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Ambos · CC=Sim · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Frequência e previsibilidade

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Mensal | — / 5 / — | — / 5 / — | Escolha quando houver fechamento previsto para todas as competências mensais. |
| Bimestral | — / 4 / — | — / 4 / — | Escolha quando o fechamento estiver previsto a cada dois meses. |
| Trimestral | — / 3 / — | — / 3 / — | Escolha quando o fechamento estiver previsto a cada três meses. |
| Quadrimestral | — / 3 / — | — / 3 / — | Escolha quando o fechamento estiver previsto a cada quatro meses. |
| Semestral | — / 2 / — | — / 2 / — | Escolha quando o fechamento estiver previsto a cada seis meses. |
| Anual | — / 1 / — | — / 1 / — | Escolha quando houver apenas um fechamento previsto por ano. |
| Sob demanda/Irregular | — / 1 / — | — / 1 / — | Escolha quando não existir calendário fixo de fechamento ou quando a frequência variar conforme solicitações e disponibilidade das informações. |

## [33] CONTÁBIL — Último Mês de Conciliação

- **Tipo:** Mascara (Data)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Pilar:** Atraso / desempenho
- **Regra:** Informe a competência mais recente cuja conciliação esteja integralmente concluída; não considere mês parcialmente conciliado.

## [34] CONTÁBIL — Nota Volume

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Cliente · CC=Sim · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Volume

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixo | — / 1 / — | — / — / — | Escolha quando o volume mensal estiver na faixa inferior definida pela área para clientes comparáveis, considerando os quantitativos efetivamente processados. |
| Médio | — / 3 / — | — / — / — | Escolha quando o volume mensal estiver na faixa intermediária definida pela área para clientes comparáveis. |
| Alto | — / 5 / — | — / — / — | Escolha quando o volume mensal estiver na faixa superior definida pela área para clientes comparáveis, de forma recorrente. |

## [35] CONTÁBIL — Nota Atendimento

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Ambos · CC=Sim · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Atendimento

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixo | — / 1 / — | — / 1 / — | Escolha quando os contatos forem pouco frequentes, majoritariamente planejados e resolvidos sem cobranças ou alinhamentos recorrentes. |
| Médio | — / 3 / — | — / 3 / — | Escolha quando houver contatos regulares e algumas solicitações ou alinhamentos fora da rotina, mas sem predominância de urgências. |
| Alto | — / 5 / — | — / 5 / — | Escolha quando houver contatos frequentes, urgências, cobranças, múltiplos interlocutores ou necessidade recorrente de acompanhamento. |

## [36] CONTÁBIL — Nota Organização

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Sim · Pessoal=Não · Geral=Sim — via área
- **Pilar:** Organização

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixa | — / — / — | — / 5 / — | Escolha quando documentos e informações chegarem frequentemente incompletos, dispersos, fora do padrão ou dependerem de cobranças e reorganização recorrentes. |
| Média | — / — / — | — / 3 / — | Escolha quando documentos e informações chegarem geralmente organizados, mas ainda apresentarem falhas ou complementações ocasionais. |
| Alta | — / — / — | — / 1 / — | Escolha quando documentos e informações chegarem completos, padronizados, centralizados e dentro do fluxo combinado de forma consistente. |

## [37] CONTÁBIL — Observações - Contábil

- **Tipo:** Texto
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Registre somente exceções ou particularidades relevantes da área CONTÁBIL que não possam ser representadas pelos demais campos; evite repetir o cadastro geral.

## [38] PESSOAL — Responsável principal - Pessoal

- **Tipo:** Relação (Base de Equipe)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe a pessoa que responde prioritariamente pela carteira deste cliente no ciclo; quando houver atuação compartilhada, use o titular formalmente definido.

## [39] PESSOAL — Responsável secundário - Pessoal

- **Tipo:** Relação (Base de Equipe)
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Informe apenas quando houver uma segunda pessoa formalmente designada para apoio, cobertura ou corresponsabilidade; caso contrário, deixe em branco.

## [40] PESSOAL — Qtd. Funcionários

- **Tipo:** Mascara (Valor)
- **Classificação:** Complexidade Cliente - Insumo · CC=Indireto · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim — base · Geral=Sim — via área
- **Pilar:** Volume de vínculos
- **Regra:** Informe a quantidade de vínculos de empregados ativos no encerramento do ciclo de referência.

## [41] PESSOAL — Qtd. Pró-labores

- **Tipo:** Mascara (Valor)
- **Classificação:** Complexidade Cliente - Insumo · CC=Indireto · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim — base · Geral=Sim — via área
- **Pilar:** Volume de vínculos
- **Regra:** Informe a quantidade de sócios ou administradores com pró-labore ativo no ciclo de referência.

## [42] PESSOAL — Qtd. Domésticas

- **Tipo:** Mascara (Valor)
- **Classificação:** Complexidade Cliente - Insumo · CC=Indireto · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim — base · Geral=Sim — via área
- **Pilar:** Volume de vínculos
- **Regra:** Informe a quantidade de vínculos de trabalhadores domésticos ativos no encerramento do ciclo de referência.

## [43] PESSOAL — Total de Vínculos

- **Tipo:** Resultado (Soma "Qtd. Funcionários", "Qtd. Pró-labores" e "Qtd. Domésticas")
- **Classificação:** Complexidade Cliente · CC=Sim — fórmula · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim · Geral=Sim — via área
- **Pilar:** Volume de vínculos
- **Regra:** Campo calculado pela soma de Funcionários, Pró-labores e Domésticas; não deve ser preenchido manualmente.

## [44] PESSOAL — Recebimento documentos

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Plataforma integrada | — / — / — | — / — / 1 | Escolha quando a maior parte dos documentos for recebida por plataforma conectada ao fluxo do escritório, sem download ou redigitação recorrente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Portal | — / — / — | — / — / 2 | Escolha quando o cliente disponibilizar a maior parte dos documentos em portal estruturado, acessado manualmente pelo escritório. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | — / — / 3 | Escolha quando o e-mail for o canal habitual de recebimento da maior parte dos documentos. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | — / — / 3 | Escolha quando a maior parte dos documentos chegar por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | — / — / 5 | Escolha quando a maior parte dos documentos for entregue em papel, presencialmente ou depender de digitalização e tratamento manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Acesso ao sistema do cliente | — / — / — | — / — / 3 | Escolha quando o escritório obtiver a maior parte das informações acessando diretamente o sistema do cliente, sem recebimento por outro canal. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não se aplica | — / — / — | — / — / — | Escolha somente quando essa etapa de recebimento não existir para o serviço prestado; não use para informação desconhecida ou ainda não recebida. |

## [45] PESSOAL — Recebimento ponto

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim · Geral=Sim — via área
- **Pilar:** Recebimento do ponto

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Sistema de ponto integrado | — / — / — | — / — / 1 | Escolha quando os dados de ponto forem transferidos por integração com o sistema utilizado no processamento da folha. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Arquivo/Exportação | — / — / — | — / — / 2 | Escolha quando o cliente gerar arquivo estruturado no sistema de ponto e o escritório importar ou utilizar essa exportação. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Planilha | — / — / — | — / — / 3 | Escolha quando os dados de ponto forem recebidos predominantemente em planilha preenchida ou consolidada pelo cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | — / — / 3 | Escolha quando os dados de ponto forem recebidos predominantemente por e-mail, no corpo da mensagem ou em anexo não integrado. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | — / — / 4 | Escolha quando os dados de ponto forem recebidos predominantemente por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | — / — / 5 | Escolha quando os dados de ponto forem recebidos em cartão, folha, relatório físico ou outro meio que exija lançamento manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não utiliza controle de ponto | — / — / — | — / — / — | Escolha somente quando o cliente não adotar controle de ponto para os vínculos atendidos; não use para informação ausente ou atrasada. |

## [46] PESSOAL — Envio documentos

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim · Geral=Sim — via área
- **Pilar:** Envio / padronização do fluxo

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Plataforma integrada | — / — / — | — / — / 1 | Escolha quando a maior parte dos documentos for disponibilizada ao cliente por plataforma conectada ao fluxo do escritório, sem envio manual recorrente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Portal | — / — / — | — / — / 2 | Escolha quando o escritório publicar manualmente a maior parte dos documentos em portal estruturado para acesso do cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| E-mail | — / — / — | — / — / 4 | Escolha quando o e-mail for o canal habitual de envio da maior parte dos documentos ao cliente. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Mensageria | — / — / — | — / — / 4 | Escolha quando a maior parte dos documentos for enviada por WhatsApp, Teams, chat ou outra ferramenta de mensagens. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Manual/Físico | — / — / — | — / — / 5 | Escolha quando a maior parte dos documentos for entregue em papel, presencialmente ou por processo físico/manual. Se houver mais de um canal, considere o predominante no ciclo; em empate, escolha o que exige mais intervenção manual. |
| Não se aplica | — / — / — | — / — / — | Escolha somente quando essa etapa de envio não existir para o serviço prestado; não use para informação desconhecida ou ainda não enviada. |

## [47] PESSOAL — Nota Atendimento

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Ambos · CC=Sim · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim · Geral=Sim — via área
- **Pilar:** Atendimento

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixo | — / — / 1 | — / — / 1 | Escolha quando os contatos forem pouco frequentes, majoritariamente planejados e resolvidos sem cobranças ou alinhamentos recorrentes. |
| Médio | — / — / 3 | — / — / 3 | Escolha quando houver contatos regulares e algumas solicitações ou alinhamentos fora da rotina, mas sem predominância de urgências. |
| Alto | — / — / 5 | — / — / 5 | Escolha quando houver contatos frequentes, urgências, cobranças, múltiplos interlocutores ou necessidade recorrente de acompanhamento. |

## [48] PESSOAL — Nota Organização

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Operacional · CC=Não · CO=Sim
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim · Geral=Sim — via área
- **Pilar:** Organização

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixa | — / — / — | — / — / 5 | Escolha quando documentos e informações chegarem frequentemente incompletos, dispersos, fora do padrão ou dependerem de cobranças e reorganização recorrentes. |
| Média | — / — / — | — / — / 3 | Escolha quando documentos e informações chegarem geralmente organizados, mas ainda apresentarem falhas ou complementações ocasionais. |
| Alta | — / — / — | — / — / 1 | Escolha quando documentos e informações chegarem completos, padronizados, centralizados e dentro do fluxo combinado de forma consistente. |

## [49] PESSOAL — Nota Rotatividade

- **Tipo:** Lista (Ver ´CADASTRO DE LISTAS')
- **Classificação:** Complexidade Cliente · CC=Sim · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Sim · Geral=Sim — via área
- **Pilar:** Rotatividade

| Opção | Nota CC (F/C/P) | Nota CO (F/C/P) | Regra |
|---|---|---|---|
| Baixa | — / — / 1 | — / — / — | Escolha quando admissões e desligamentos forem raros em relação ao quadro e a quantidade de vínculos permanecer estável na maior parte dos últimos 12 meses. |
| Média | — / — / 3 | — / — / — | Escolha quando houver admissões e desligamentos recorrentes, mas sem alteração frequente de parcela relevante do quadro nos últimos 12 meses. |
| Alta | — / — / 5 | — / — / — | Escolha quando admissões e desligamentos forem frequentes e afetarem parcela relevante do quadro de forma recorrente nos últimos 12 meses. |

## [50] PESSOAL — Observações - Pessoal

- **Tipo:** Texto
- **Classificação:** Cadastro / Controle · CC=Não · CO=Não
- **Aplica em:** Fiscal=Não · Contábil=Não · Pessoal=Não · Geral=Não
- **Regra:** Registre somente exceções ou particularidades relevantes da área PESSOAL que não possam ser representadas pelos demais campos; evite repetir o cadastro geral.
