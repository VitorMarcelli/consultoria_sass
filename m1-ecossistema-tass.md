# M1: Ecossistema TASS (Tempos, Entregas e Oportunidades)

> Plano arquitetural e cronograma de tarefas para finalizar o Momento 1 (M1) elevando a plataforma de SaaS para um Ecossistema Completo "TASS".

---

## 📋 Overview

O **Sevilha Performance** está evoluindo de um SaaS genérico para um **Ecossistema Completo TASS (Total Accounting & System Solution)**. O objetivo deste plano é implementar e integrar totalmente o Momento 1 (M1), englobando:
1. **Gestão de Tempos e Custo Gerencial (Timesheet Assistido & DRE do Contrato):** Apontamento em tempo real e cálculo exato de margem baseada no custo do colaborador (`grossSalary`).
2. **Workflow de Entregas 360º com Conformidade Automática:** Geração automatizada de matriz de entregas (Padrão Domínio) via CRON/Jobs assíncronos no NestJS e painéis slide-overs integrados.
3. **Painel de Oportunidades e Hub de Inteligência Comercial:** CRM interno com mineração automatizada de cross-sell e up-sell (analisando volumes de notas, admissões e gargalos de horas), já com modelagem estrutural preparada para o futuro Portal do Cliente.

---

## 🏗️ Project Type

**WEB & BACKEND**
- **Frontend:** Next.js (App Router), React 19, TailwindCSS, Framer Motion (Glassmorphism UI/UX Premium).
- **Backend:** NestJS, Prisma ORM, PostgreSQL, Supabase Auth.

---

## 🎯 Success Criteria

| ID | Critério | Métrica de Validação (VERIFY) |
|---|---|---|
| **SC1** | Matriz de Conformidade Automática | Abertura de um `ManagementCycle` no NestJS gera automaticamente as entregas mensais baseadas no regime tributário do cliente. |
| **SC2** | DRE do Contrato em Tempo Real | Consulta à API retorna o custo R$ exato das horas apontadas debitadas da mensalidade (`Client.monthlyFee`), filtrado por `Role` (LEADER/ADMIN). |
| **SC3** | Mineração de Oportunidades | Gatilhos de estouro de horas ou crescimento de volume geram registros automáticos na nova tabela de `Opportunity`. |
| **SC4** | Excelência Visual e UI Premium | Interface fluida em Glassmorphism, 0% de cores roxas/violetas, e tempos de resposta rápidos na navegação de `/entregas` e `/oportunidades`. |

---

## 🛠️ Tech Stack & Rationale

| Tecnologia | Finalidade | Justificativa / Racional (Trade-offs) |
|---|---|---|
| **Prisma ORM** | Modelagem de Dados | Criação fluida de relacionamentos complexos (`Opportunity`, `DeliveryTemplate`, `TimeLog`) com segurança de tipos. |
| **NestJS (Cron/Jobs)** | Automação de Entregas | Módulo `@nestjs/schedule` para rodar rotinas assíncronas de abertura de ciclo e varredura de oportunidades sem onerar o loop HTTP. |
| **Next.js App Router** | Frontend UI/UX | Server Components para buscas rápidas e Client Components limpos para os cronômetros e widgets de apontamento. |
| **Framer Motion** | Micro-animações | Criação do widget flutuante do timesheet e slide-overs 360º suaves para garantir a percepção ultra-premium do sistema. |
| **TailwindCSS v4** | Estilização Avançada | Classes utilitárias limpas para efeitos Glassmorphism (`backdrop-blur`, `bg-slate-900/50`, `border-teal-500/20`). |

---

## 📁 File Structure

```plaintext
a:/Aplicativos Vitor/consultoria_sass/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # Adição de Opportunity, TimeLog, DeliveryTemplate
│   └── src/
│       ├── deliveries/                # Services de entregas e Cron de geração mensal
│       ├── opportunities/             # NOVO: CRUD e engine de mineração de up-sell
│       └── timesheets/                # NOVO: Apontamento e cálculo de DRE do contrato
└── frontend/
    └── src/
        ├── app/
        │   ├── (dashboard)/
        │   │   ├── entregas/          # Refatoração com abas dinâmicas e slide-overs 360º
        │   │   └── oportunidades/     # NOVO: Página do Kanban/Grid de oportunidades
        └── components/
            ├── timesheet/             # NOVO: Widget flutuante de time tracking
            └── slide-overs/           # Slide-overs detalhados de cliente e entrega
```

---

## 📊 Task Breakdown

> **P0:** Banco & Backend Core | **P1:** Motor de Automação | **P2:** Frontend & UI Premium | **P3:** Integração & Polish

```markdown
### [ ] P0.1: Atualização do Schema do Prisma (Modelos TASS)
- **task_id:** schema_tass_models
- **agent:** `database-architect`
- **skills:** `database-design`, `prisma-expert`
- **priority:** P0
- **dependencies:** Nenhuma
- **INPUT:** `backend/prisma/schema.prisma`
- **OUTPUT:** Adição dos models `DeliveryTemplate`, `TimeLog` (ligado a Employee e Delivery) e `Opportunity` (com tipo de gatilho e status).
- **VERIFY:** Rodar `npx prisma db push` e `npx prisma generate` no diretório do backend com sucesso.

### [ ] P0.2: Módulo e Services de Apontamento e Margem (Timesheet)
- **task_id:** backend_timesheet_service
- **agent:** `backend-specialist`
- **skills:** `api-patterns`, `nestjs-expert`, `clean-code`
- **priority:** P0
- **dependencies:** schema_tass_models
- **INPUT:** Novo módulo `backend/src/timesheets/`
- **OUTPUT:** Endpoints para iniciar/parar cronômetro, registrar horas manuais e service que calcula o custo total R$ por contrato (com trava de segurança para `LEADER`/`ADMIN`).
- **VERIFY:** Testes unitários do NestJS ou compilação limpa via `npm run build`.

### [ ] P1.1: Cron e Geração Automática de Entregas (Padrão Domínio)
- **task_id:** backend_delivery_automation
- **agent:** `backend-specialist`
- **skills:** `nestjs-expert`, `nodejs-best-practices`
- **priority:** P1
- **dependencies:** schema_tass_models
- **INPUT:** `backend/src/deliveries/` e pacote `@nestjs/schedule`
- **OUTPUT:** Routine Job que identifica novos ciclos mensais (`ManagementCycle`) e injeta registros na tabela `Delivery` baseados nos `DeliveryTemplate` do regime tributário do cliente.
- **VERIFY:** Verificar injeção de dependência e compilação do NestJS (`npm run start:dev` limpo).

### [ ] P1.2: Módulo e Motor de Mineração de Oportunidades (Gatilhos)
- **task_id:** backend_opportunity_engine
- **agent:** `backend-specialist`
- **skills:** `api-patterns`, `nestjs-expert`
- **priority:** P1
- **dependencies:** schema_tass_models
- **INPUT:** Novo módulo `backend/src/opportunities/`
- **OUTPUT:** CRUD de Oportunidades e listener que escuta alterações no `ClientTaxInfo`, `ClientHrInfo` e `TimeLog` para gerar cards automáticos de cross-sell/up-sell.
- **VERIFY:** Endpoints acessíveis e sem erros de TypeScript no backend.

### [ ] P2.1: UI do Widget Flutuante de Timesheet (Framer Motion)
- **task_id:** frontend_timesheet_widget
- **agent:** `frontend-specialist`
- **skills:** `frontend-design`, `react-best-practices`, `tailwind-patterns`
- **priority:** P2
- **dependencies:** backend_timesheet_service
- **INPUT:** `frontend/src/components/timesheet/TimerWidget.tsx`
- **OUTPUT:** Componente flutuante e persistido no estado (com Glassmorphism) que permite iniciar/pausar timer e exibir o tempo correndo na barra superior ou inferior.
- **VERIFY:** Renderização correta no Next.js sem erros de hidratação ou lint.

### [ ] P2.2: Refatoração da Página de Entregas (Slide-overs 360º)
- **task_id:** frontend_entregas_360
- **agent:** `frontend-specialist`
- **skills:** `frontend-design`, `react-best-practices`
- **priority:** P2
- **dependencies:** backend_delivery_automation
- **INPUT:** `frontend/src/app/(dashboard)/entregas/page.tsx`
- **OUTPUT:** Transformação da tabela estática em um painel interativo avançado, exibindo faróis de SLA, visão de DRE do contrato para líderes e chamadas para os Slide-overs 360º.
- **VERIFY:** Página `/entregas` carregando com sucesso no navegador e sem warnings no console.

### [ ] P2.3: Criação da Página do Painel de Oportunidades (CRM)
- **task_id:** frontend_oportunidades_page
- **agent:** `frontend-specialist`
- **skills:** `frontend-design`, `tailwind-patterns`
- **priority:** P2
- **dependencies:** backend_opportunity_engine
- **INPUT:** `frontend/src/app/(dashboard)/oportunidades/page.tsx`
- **OUTPUT:** Layout em colunas/Kanban e relatórios executivos exibindo oportunidades manuais e as geradas automaticamente pelo motor do TASS.
- **VERIFY:** Acesso limpo a `/oportunidades` e visualização impecável dos cards.

### [ ] P3.1: Integração Global e Testes de Fluxo M1
- **task_id:** m1_global_integration
- **agent:** `test-engineer`
- **skills:** `webapp-testing`, `clean-code`
- **priority:** P3
- **dependencies:** frontend_timesheet_widget, frontend_entregas_360, frontend_oportunidades_page
- **INPUT:** Todo o escopo M1
- **OUTPUT:** Garantir que apontar horas no timer reflete no custo da entrega, e que o excesso de horas gera a oportunidade no CRM.
- **VERIFY:** Execução completa do checklist de verificação (Phase X).
```

---

## ✅ PHASE X: Final Verification (Checklist)

> **MANDATORY SCRIPT EXECUTION:** O M1 só será considerado 100% concluído após a aprovação em todos os scripts e validações abaixo.

### 1. Comandos de Validação Automatizada
```bash
# P0: Lint & Type Check (Frontend e Backend)
cd frontend && npm run lint
cd ../backend && npm run lint

# P0: Security Scan (vulnerabilidades e segredos)
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .

# P1: UX Audit (Leis de UX, contraste e acessibilidade)
python .agent/skills/frontend-design/scripts/ux_audit.py .

# P3: Lighthouse (Performance e Core Web Vitals)
# (Requer servidores rodando localmente)
python .agent/skills/performance-profiling/scripts/lighthouse_audit.py http://localhost:3000
```

### 2. Rule Compliance (Verificação Manual)
- `[ ]` **Purple Ban:** Nenhuma linha de CSS ou classe Tailwind utiliza hex codes ou classes de cores roxas/violetas.
- `[ ]` **Template Ban:** O sistema rejeita layouts engessados, usando Glassmorphism, slide-overs 360º e abas dinâmicas.
- `[ ]` **Socratic Gate:** O alinhamento com o CTO e os sócios foi rigorosamente respeitado antes de iniciar a codificação.

### 3. Subida do Ambiente e Teste Fim-a-Fim
```bash
# Rodar o facilitador no Windows:
./start_servers.bat
```

### 4. Phase X Completion Marker
*(Este bloco será preenchido e marcado como ✅ assim que todas as implementações e scripts passarem com sucesso).*

```markdown
## ✅ PHASE X COMPLETE
- Lint & Types: [ ] Pendente
- Security Scan: [ ] Pendente
- UX & UI Audit: [ ] Pendente
- Build Backend: [ ] Pendente
- Build Frontend: [ ] Pendente
- Data de Conclusão: [Em andamento]
```
